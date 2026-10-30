import { getConnInfo } from '@hono/node-server/conninfo';
import type { Site } from '@ventana/sim';
import { Hono, type Context } from 'hono';
import { computeEphemeris } from './ephemeris.ts';
import { HorizonsError, type HorizonsClient } from './horizons/client.ts';
import { ParamError, parseEphemerisParams, roundToGrid, type RawEphemerisParams } from './params.ts';

/** What the API needs from the outside world, injected so tests can replace it. */
export interface AppDeps {
  /** Horizons, through its disk cache. */
  readonly horizons: HorizonsClient;
  /** The landing sites the API knows by id. */
  readonly sites: readonly Site[];
  /** Current time in ms since the epoch. */
  readonly now: () => number;
  /** Limits the Horizons downloads (cache misses) per client IP; by default {@link createMissLimiter} with its defaults. */
  readonly missLimiter?: MissLimiter;
}

/** Cache misses one client IP may cause per window when the caller sets no limit. */
export const DEFAULT_MISSES_PER_WINDOW = 30;
/** Length of the miss-limit window when the caller sets none: 10 minutes. */
export const DEFAULT_MISS_WINDOW_MS = 10 * 60 * 1000;
// Keys the limiter keeps at most; past it the oldest key is dropped, so the map cannot grow without bound.
const DEFAULT_MAX_LIMITER_KEYS = 10_000;

/** A fixed-window counter of cache misses per key (the client IP). */
export interface MissLimiter {
  /** Counts one miss for `key`: 0 when allowed, else the whole seconds until the key's window ends. */
  take(key: string): number;
  /** Keys held in memory. */
  size(): number;
}

/** Settings of {@link createMissLimiter}. */
export interface MissLimiterOptions {
  readonly limit?: number;
  readonly windowMs?: number;
  readonly now?: () => number;
  readonly maxKeys?: number;
}

/**
 * An in-memory fixed-window limiter. Expired keys are pruned at most once per window, and when the map is full the
 * oldest key is dropped (a Map iterates in insertion order), so memory stays bounded whatever the number of clients.
 */
export function createMissLimiter(options: MissLimiterOptions = {}): MissLimiter {
  const limit = options.limit ?? DEFAULT_MISSES_PER_WINDOW;
  const windowMs = options.windowMs ?? DEFAULT_MISS_WINDOW_MS;
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_LIMITER_KEYS;
  const windows = new Map<string, { start: number; count: number }>();
  let lastPrune = now();

  function prune(at: number): void {
    for (const [key, entry] of windows) {
      if (at - entry.start >= windowMs) windows.delete(key);
    }
    lastPrune = at;
  }

  return {
    take(key) {
      const at = now();
      if (at - lastPrune >= windowMs) prune(at);
      let entry = windows.get(key);
      if (entry === undefined || at - entry.start >= windowMs) {
        windows.delete(key);
        if (windows.size >= maxKeys) prune(at);
        if (windows.size >= maxKeys) {
          const oldest = windows.keys().next();
          if (oldest.done !== true) windows.delete(oldest.value);
        }
        entry = { start: at, count: 0 };
        windows.set(key, entry);
      }
      if (entry.count >= limit) return Math.ceil((entry.start + windowMs - at) / 1000);
      entry.count += 1;
      return 0;
    },
    size: () => windows.size,
  };
}

/** A client IP passed its cache-miss limit; `retryAfterSec` says when its window ends. */
class MissLimitError extends Error {
  override readonly name = 'MissLimitError';
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super('cache miss limit reached');
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * The client IP the miss limit is keyed on. In production the API sits behind Traefik, which appends the address it
 * received the connection from to X-Forwarded-For, so the right-most entry is the one a client cannot forge (anything
 * to its left is whatever the client sent). Without the header (a direct connection, local runs) it is the socket
 * address; `getConnInfo` throws when the app runs outside the Node server (as in tests), and then every caller shares
 * the key 'unknown'. If another proxy is ever put in front of Traefik, this key becomes that proxy's address.
 */
function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  const last = forwarded?.split(',').at(-1)?.trim();
  if (last) return last;
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Answers for a fixed point and range only change if Horizons revises its ephemeris, so browsers and proxies may
// keep them for a while.
const EPHEMERIS_CACHE_CONTROL = 'public, max-age=3600';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
// Seconds a client is told to wait when the Horizons download queue is full.
const BUSY_RETRY_AFTER_SEC = 30;

/** Answers with the ephemeris alone, or as `{ ...wrap, ephemeris }` when `wrap` is given. */
async function ephemerisResponse(c: Context, deps: AppDeps, limiter: MissLimiter, raw: RawEphemerisParams, wrap?: object) {
  try {
    const request = parseEphemerisParams(raw, deps.now());
    // A point that matches a curated site after rounding is always needed: its tables are pinned in the cache.
    const pinnedPoint = deps.sites.some(
      (site) => roundToGrid(site.lat) === request.lat && roundToGrid(site.lonEast) === request.lonEast,
    );
    const ip = clientIp(c);
    const onMiss = (): void => {
      const wait = limiter.take(ip);
      if (wait > 0) throw new MissLimitError(wait);
    };
    const ephemeris = await computeEphemeris(deps.horizons, request, { onMiss, pinnedPoint });
    c.header('Cache-Control', EPHEMERIS_CACHE_CONTROL);
    return c.json(wrap === undefined ? ephemeris : { ...wrap, ephemeris });
  } catch (error) {
    if (error instanceof ParamError) return c.json({ error: error.message }, HTTP_BAD_REQUEST);
    if (error instanceof MissLimitError) {
      c.header('Retry-After', String(error.retryAfterSec));
      return c.json({ error: 'too many new points from this address; try again later' }, HTTP_TOO_MANY_REQUESTS);
    }
    if (error instanceof HorizonsError && error.kind === 'busy') {
      c.header('Retry-After', String(BUSY_RETRY_AFTER_SEC));
      return c.json({ error: 'the service is busy; try again later' }, HTTP_SERVICE_UNAVAILABLE);
    }
    if (error instanceof HorizonsError) {
      console.error(`horizons: ${error.kind}: ${error.message}`);
      return c.json({ error: 'JPL Horizons did not return the ephemeris; try again later' }, HTTP_BAD_GATEWAY);
    }
    throw error;
  }
}

/** Version 1 of the API: every route, mounted by {@link createApp} under `/api/v1`. */
function createV1(deps: AppDeps, limiter: MissLimiter): Hono {
  const v1 = new Hono();
  v1.get('/health', (c) => c.json({ ok: true }));

  // Any point: lat and lon (east longitude) in degrees, from and to as UTC dates or whole hours, optional at.
  v1.get('/ephemeris', (c) => ephemerisResponse(c, deps, limiter, c.req.query()));

  v1.get('/sites', (c) => c.json({ sites: deps.sites }));

  // One site; with from and to it also carries the site's ephemeris for that range.
  v1.get('/sites/:id', (c) => {
    const site = deps.sites.find((s) => s.id === c.req.param('id'));
    if (!site) return c.json({ error: 'unknown site' }, HTTP_NOT_FOUND);
    const { from, to, at } = c.req.query();
    if (from === undefined && to === undefined) return c.json({ site });
    return ephemerisResponse(c, deps, limiter, { lat: String(site.lat), lon: String(site.lonEast), from, to, at }, { site });
  });
  return v1;
}

/**
 * Builds the HTTP API. Routes live under `/api` because the web and the API share one domain, and under a version
 * prefix (`/api/v1`) so a future version can be mounted next to it. There are no unversioned aliases.
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  // One limiter per app, shared by every route (and every version) that may call Horizons.
  const limiter = deps.missLimiter ?? createMissLimiter({ now: deps.now });
  app.route('/api/v1', createV1(deps, limiter));
  return app;
}
