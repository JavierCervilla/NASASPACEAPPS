import type { Site } from '@ventana/sim';
import { Hono, type Context } from 'hono';
import { computeEphemeris } from './ephemeris.ts';
import { HorizonsError, type HorizonsClient } from './horizons/client.ts';
import { ParamError, parseEphemerisParams, type RawEphemerisParams } from './params.ts';

/** What the API needs from the outside world, injected so tests can replace it. */
export interface AppDeps {
  /** Horizons, through its disk cache. */
  readonly horizons: HorizonsClient;
  /** The landing sites the API knows by id. */
  readonly sites: readonly Site[];
  /** Current time in ms since the epoch. */
  readonly now: () => number;
}

// Answers for a fixed point and range only change if Horizons revises its ephemeris, so browsers and proxies may
// keep them for a while.
const EPHEMERIS_CACHE_CONTROL = 'public, max-age=3600';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_GATEWAY = 502;

/** Answers with the ephemeris alone, or as `{ ...wrap, ephemeris }` when `wrap` is given. */
async function ephemerisResponse(c: Context, deps: AppDeps, raw: RawEphemerisParams, wrap?: object) {
  try {
    const request = parseEphemerisParams(raw, deps.now());
    const ephemeris = await computeEphemeris(deps.horizons, request);
    c.header('Cache-Control', EPHEMERIS_CACHE_CONTROL);
    return c.json(wrap === undefined ? ephemeris : { ...wrap, ephemeris });
  } catch (error) {
    if (error instanceof ParamError) return c.json({ error: error.message }, HTTP_BAD_REQUEST);
    if (error instanceof HorizonsError) {
      console.error(`horizons: ${error.kind}: ${error.message}`);
      return c.json({ error: 'JPL Horizons did not return the ephemeris; try again later' }, HTTP_BAD_GATEWAY);
    }
    throw error;
  }
}

/** Builds the HTTP API. Routes live under `/api` because the web and the API share one domain. */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  app.get('/api/health', (c) => c.json({ ok: true }));

  // Any point: lat and lon (east longitude) in degrees, from and to as UTC dates or whole hours, optional at.
  app.get('/api/ephemeris', (c) => ephemerisResponse(c, deps, c.req.query()));

  app.get('/api/sites', (c) => c.json({ sites: deps.sites }));

  // One site; with from and to it also carries the site's ephemeris for that range.
  app.get('/api/sites/:id', (c) => {
    const site = deps.sites.find((s) => s.id === c.req.param('id'));
    if (!site) return c.json({ error: 'unknown site' }, HTTP_NOT_FOUND);
    const { from, to, at } = c.req.query();
    if (from === undefined && to === undefined) return c.json({ site });
    return ephemerisResponse(c, deps, { lat: String(site.lat), lon: String(site.lonEast), from, to, at }, { site });
  });
  return app;
}
