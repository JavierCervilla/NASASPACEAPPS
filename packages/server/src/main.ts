/**
 * Server startup. Environment: PORT (default 3000), HORIZONS_CACHE_DIR (default
 * ./.cache/horizons; curated-site and DSN tables go to its `pinned/`, any other
 * point to its `points/`, and tables cached directly in it by older versions
 * are still read), HORIZONS_POINTS_CACHE_MB (byte cap of `points/`, least
 * recently used tables evicted first; default 512), SITES_FILE (default
 * packages/server/data/sites.json) and WARM_CACHE (`0` skips the start-up cache
 * warm-up; tests never run this file, so they never warm).
 */
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import {
  DEFAULT_CACHE_DIR,
  DEFAULT_MAX_POINTS_BYTES,
  createHorizonsClient,
  type FetchLike,
} from './horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from './sites.ts';
import { warmCache } from './warmup.ts';

const DEFAULT_PORT = 3000;
// A Horizons call that takes longer is abandoned (and retried like a dropped
// connection).
const HORIZONS_TIMEOUT_MS = 20_000;
const BYTES_PER_MB = 1024 * 1024;

function pointsCacheBytes(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_MAX_POINTS_BYTES;
  const mb = Number(raw);
  if (!Number.isFinite(mb) || mb <= 0) throw new Error(`HORIZONS_POINTS_CACHE_MB must be a positive number, got "${raw}"`);
  return Math.floor(mb * BYTES_PER_MB);
}

const fetchWithTimeout: FetchLike = (url) =>
  fetch(url, { signal: AbortSignal.timeout(HORIZONS_TIMEOUT_MS) });
const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
const horizons = createHorizonsClient({
  fetch: fetchWithTimeout,
  cacheDir: process.env['HORIZONS_CACHE_DIR'] ?? DEFAULT_CACHE_DIR,
  maxPointsBytes: pointsCacheBytes(process.env['HORIZONS_POINTS_CACHE_MB']),
});
const sites = await loadSites(process.env['SITES_FILE'] ?? DEFAULT_SITES_FILE);
const app = createApp({
  horizons,
  pointsCache: horizons.points,
  sites,
  now: Date.now,
});
const server = serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`server listening on port ${info.port}\n`);
});
process.on('SIGTERM', () => server.close());

// Size points/ once at start, in the background, so the health answer reports
// the real cache size from boot instead of 0 until the first custom point.
void horizons.points.ready().catch((error: unknown) => {
  console.error(`points cache: first scan failed: ${(error as Error).message}`);
});

if (process.env['WARM_CACHE'] !== '0') {
  // In the background: the server answers from the first moment, and a visitor
  // who asks before the warm-up reaches their site shares its in-flight
  // Horizons calls.
  const log = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };
  void warmCache({ horizons, sites, log }).catch((error: unknown) => {
    console.error(`warm-up: stopped: ${(error as Error).message}`);
  });
}
