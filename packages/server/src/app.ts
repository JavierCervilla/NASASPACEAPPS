/** The HTTP API: route wiring and the mapping of errors to HTTP answers. */
import type { Site } from '@ventana/sim';
import { Hono, type Context } from 'hono';
import { apiHeaders } from './api-headers.ts';
import { clientIp } from './client-ip.ts';
import { computeEphemeris, type EphemerisRequest } from './ephemeris.ts';
import {
  HorizonsError,
  type HorizonsClient,
  type PointsUsageSource,
} from './horizons/client.ts';
import {
  MissLimitError,
  createMissLimiter,
  limitMisses,
  type MissLimiter,
} from './miss-limiter.ts';
import {
  ParamError,
  parseEphemerisParams,
  roundToGrid,
  type RawEphemerisParams,
} from './params.ts';

/**
 * What the API needs from the outside world, injected so tests can replace it.
 */
export interface AppDeps {
  /** Horizons, through its disk cache. */
  readonly horizons: HorizonsClient;
  /** The landing sites the API knows by id. */
  readonly sites: readonly Site[];
  /**
   * The custom-point cache, whose tracked size and cap /health reports (the
   * size comes from the scan the server runs at start).
   */
  readonly pointsCache: PointsUsageSource;
  /** Current time in ms since the epoch. */
  readonly now: () => number;
  /**
   * Limits the Horizons downloads (cache misses) per client IP; by default
   * {@link createMissLimiter} with its defaults.
   */
  readonly missLimiter?: MissLimiter;
}

/** {@link AppDeps} with the limiter chosen, shared by every route. */
type RouteDeps = AppDeps & { readonly missLimiter: MissLimiter };

// Answers for a fixed point and range only change if Horizons revises its
// ephemeris, so browsers and proxies may keep them for a while.
const EPHEMERIS_CACHE_CONTROL = 'public, max-age=3600';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
// Seconds a client is told to wait when the Horizons download queue is full.
const BUSY_RETRY_AFTER_SEC = 30;

/** The HTTP answer for an error of an ephemeris request; rethrows the rest. */
function errorResponse(c: Context, error: unknown): Response {
  if (error instanceof ParamError) {
    return c.json({ error: error.message }, HTTP_BAD_REQUEST);
  }
  if (error instanceof MissLimitError) {
    c.header('Retry-After', String(error.retryAfterSec));
    const message = 'too many new points from this address; try again later';
    return c.json({ error: message }, HTTP_TOO_MANY_REQUESTS);
  }
  if (error instanceof HorizonsError && error.kind === 'busy') {
    c.header('Retry-After', String(BUSY_RETRY_AFTER_SEC));
    const message = 'the service is busy; try again later';
    return c.json({ error: message }, HTTP_SERVICE_UNAVAILABLE);
  }
  if (error instanceof HorizonsError) {
    console.error(`horizons: ${error.kind}: ${error.message}`);
    const message = 'JPL Horizons did not return the ephemeris; try again later';
    return c.json({ error: message }, HTTP_BAD_GATEWAY);
  }
  throw error;
}

/**
 * A point that matches a curated site after rounding is always needed: its
 * tables are pinned in the cache.
 */
function isCuratedPoint(
  sites: readonly Site[],
  request: EphemerisRequest,
): boolean {
  return sites.some(
    (site) =>
      roundToGrid(site.lat) === request.lat &&
      roundToGrid(site.lonEast) === request.lonEast,
  );
}

/**
 * Answers with the ephemeris alone, or as `{ ...wrap, ephemeris }` when
 * `wrap` is given.
 */
async function ephemerisResponse(
  c: Context,
  deps: RouteDeps,
  raw: RawEphemerisParams,
  wrap?: object,
): Promise<Response> {
  try {
    const request = parseEphemerisParams(raw, deps.now());
    const ephemeris = await computeEphemeris(deps.horizons, request, {
      onMiss: limitMisses(deps.missLimiter, () => clientIp(c)),
      pinnedPoint: isCuratedPoint(deps.sites, request),
    });
    c.header('Cache-Control', EPHEMERIS_CACHE_CONTROL);
    return c.json(wrap === undefined ? ephemeris : { ...wrap, ephemeris });
  } catch (error) {
    return errorResponse(c, error);
  }
}

/**
 * Version 1 of the API: every route, mounted by {@link createApp} under
 * `/api/v1`.
 */
function createV1(deps: RouteDeps): Hono {
  const v1 = new Hono();
  // The cache numbers feed an alarm on the volume, which Dokploy cannot size.
  // Only the two numbers are copied: no paths reach the answer.
  v1.get('/health', async (c) => {
    const usage = await deps.pointsCache.usage();
    const { pointsBytes, pointsCapBytes } = usage;
    return c.json({ ok: true, cache: { pointsBytes, pointsCapBytes } });
  });

  // Any point: lat and lon (east longitude) in degrees, from and to as UTC
  // dates or whole hours, optional at.
  v1.get('/ephemeris', (c) => ephemerisResponse(c, deps, c.req.query()));

  v1.get('/sites', (c) => c.json({ sites: deps.sites }));

  // One site; with from and to it also carries the site's ephemeris for that
  // range.
  v1.get('/sites/:id', (c) => {
    const site = deps.sites.find((s) => s.id === c.req.param('id'));
    if (!site) return c.json({ error: 'unknown site' }, HTTP_NOT_FOUND);
    const { from, to, at } = c.req.query();
    if (from === undefined && to === undefined) return c.json({ site });
    const point = { lat: String(site.lat), lon: String(site.lonEast) };
    return ephemerisResponse(c, deps, { ...point, from, to, at }, { site });
  });
  return v1;
}

/**
 * Builds the HTTP API. Routes live under `/api` because the web and the API
 * share one domain, and under a version prefix (`/api/v1`) so a future version
 * can be mounted next to it. There are no unversioned aliases.
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  // One limiter per app, shared by every route (and every version) that may
  // call Horizons.
  const missLimiter = deps.missLimiter ?? createMissLimiter({ now: deps.now });
  app.use('/api/*', apiHeaders());
  app.route('/api/v1', createV1({ ...deps, missLimiter }));
  return app;
}
