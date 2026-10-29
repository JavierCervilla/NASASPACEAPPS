/**
 * Server startup. Environment: PORT (default 3000), HORIZONS_CACHE_DIR (default ./.cache/horizons), SITES_FILE
 * (default packages/server/data/sites.json) and WARM_CACHE (`0` skips the start-up cache warm-up; tests never run this
 * file, so they never warm).
 */
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { DEFAULT_CACHE_DIR, createHorizonsClient } from './horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from './sites.ts';
import { warmCache } from './warmup.ts';

const DEFAULT_PORT = 3000;

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
const horizons = createHorizonsClient({ fetch, cacheDir: process.env['HORIZONS_CACHE_DIR'] ?? DEFAULT_CACHE_DIR });
const sites = await loadSites(process.env['SITES_FILE'] ?? DEFAULT_SITES_FILE);
const server = serve({ fetch: createApp({ horizons, sites, now: Date.now }).fetch, port }, (info) => {
  process.stdout.write(`server listening on port ${info.port}\n`);
});
process.on('SIGTERM', () => server.close());

if (process.env['WARM_CACHE'] !== '0') {
  // In the background: the server answers from the first moment, and a visitor who asks before the warm-up reaches
  // their site shares its in-flight Horizons calls.
  void warmCache({ horizons, sites, log: (line) => process.stdout.write(`${line}\n`) }).catch((error: unknown) => {
    console.error(`warm-up: stopped: ${(error as Error).message}`);
  });
}
