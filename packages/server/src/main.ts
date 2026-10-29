/**
 * Server startup. Environment: PORT (default 3000), HORIZONS_CACHE_DIR (default ./.cache/horizons) and SITES_FILE
 * (default packages/server/data/sites.json).
 */
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { DEFAULT_CACHE_DIR, createHorizonsClient } from './horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from './sites.ts';

const DEFAULT_PORT = 3000;

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
const horizons = createHorizonsClient({ fetch, cacheDir: process.env['HORIZONS_CACHE_DIR'] ?? DEFAULT_CACHE_DIR });
const sites = await loadSites(process.env['SITES_FILE'] ?? DEFAULT_SITES_FILE);
const server = serve({ fetch: createApp({ horizons, sites, now: Date.now }).fetch, port }, (info) => {
  process.stdout.write(`server listening on port ${info.port}\n`);
});
process.on('SIGTERM', () => server.close());
