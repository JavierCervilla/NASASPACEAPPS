/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * Server startup. Environment: PORT (default 3000), HORIZONS_CACHE_DIR (default
 * ./.cache/horizons; curated-site and DSN tables go to its `pinned/`, any other
 * point to its `points/`, and tables cached directly in it by older versions
 * are still read), HORIZONS_POINTS_CACHE_MB (byte cap of `points/`, least
 * recently used tables evicted first; default 512), SITES_FILE (default
 * packages/server/data/sites.json) and WARM_CACHE (`0` skips the start-up cache
 * warm-up; tests never run this file, so they never warm). Terrain (VENT-40,
 * docs/terrain-api.md): TERRAIN_DIR (the LOLA grids; unset, /horizon answers
 * 503), TERRAIN_CACHE_DIR (default ./.cache/terrain), TERRAIN_CACHE_MB (its
 * byte cap, default 256), TERRAIN_BLOCKS_MB (grid blocks kept in memory,
 * default 192) and TERRAIN_MAX_RUNNING (horizons computed at once, default 2).
 * TERRAIN_FETCH_TIERS (VENT-43: `all` or tier ids separated by commas) has
 * the server fetch the tiers it lacks into TERRAIN_DIR once it listens.
 */
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { stopGracefully } from './graceful-stop.ts';
import {
  DEFAULT_CACHE_DIR,
  DEFAULT_MAX_POINTS_BYTES,
  createHorizonsClient,
  type FetchLike,
} from './horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from './sites.ts';
import { fetchOnBoot, terrainStatusOf } from './terrain/terrain-boot.ts';
import { openTerrain } from './terrain/terrain-config.ts';
import { nodeFetchDeps } from './terrain/node-fetch-deps.ts';
import { warmCache } from './warmup.ts';

const DEFAULT_PORT = 3000;
// A Horizons call that takes longer is abandoned (and retried like a dropped
// connection).
const HORIZONS_TIMEOUT_MS = 20_000;
const BYTES_PER_MB = 1024 * 1024;
// SIGTERM: how long the terrain fetch may take to let go before the exit.
const SHUTDOWN_GRACE_MS = 5_000;

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
const terrain = await openTerrain(process.env);
const terrainStatus = terrain && terrainStatusOf(terrain);
const app = createApp({
  horizons,
  pointsCache: horizons.points,
  sites,
  now: Date.now,
  terrain: terrain?.horizons,
  terrainStatus: terrainStatus && (() => terrainStatus.snapshot()),
});
// Aborted on SIGTERM: the fetch stops at once, keeps its part and lets go
// of the volume's lock.
const stopFetch = new AbortController();
let fetching: Promise<unknown> = Promise.resolve();
const server = serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`server listening on port ${info.port}\n`);
  // In the background, one file at a time: serving never waits for it.
  if (!terrain || !terrainStatus) return;
  const raw = process.env['TERRAIN_FETCH_TIERS'];
  const options = { raw, status: terrainStatus };
  const deps = nodeFetchDeps(stopFetch.signal);
  fetching = fetchOnBoot(deps, terrain, options).catch((error: unknown) => {
    terrainStatus.run('stopped');
    const why = stopFetch.signal.aborted ? 'shutting down' : (error as Error).message;
    console.error(`terrain fetch: stopped: ${why}`);
  });
});
process.on('SIGTERM', () => {
  void stopGracefully({
    abort: stopFetch,
    closeServer: () => server.close(),
    pending: fetching,
    graceMs: SHUTDOWN_GRACE_MS,
    exit: (code) => process.exit(code),
  });
});

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
