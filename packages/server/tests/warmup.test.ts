import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Site } from '@ventana/sim';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { HorizonsError, createHorizonsClient, type HorizonsClient } from '../src/horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from '../src/sites.ts';
import { WARM_BUSY_DELAY_MS, WARM_BUSY_RETRIES, WARM_FROM, WARM_TO, warmCache } from '../src/warmup.ts';
import { fixedFetch, fixtureFetch } from './fake-horizons.ts';

const SITES: Site[] = await loadSites(DEFAULT_SITES_FILE);
const IM2 = SITES.filter((s) => s.id === 'im2-athena');

let cacheDir: string;
beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'horizons-warm-'));
});

describe('warmCache', () => {
  it('warms the default range, November and December 2026', () => {
    expect([WARM_FROM, WARM_TO]).toEqual(['2026-11-01', '2026-12-31']);
  });

  it('caches every table a site needs, so the site route then answers without calling Horizons', async () => {
    const fetch = fixtureFetch();
    const horizons = createHorizonsClient({ fetch, cacheDir });
    const lines: string[] = [];
    const result = await warmCache({ horizons, sites: IM2, log: (line) => lines.push(line) });
    // Sun and Earth from the site plus the three DSN complexes, for two months.
    expect(result).toEqual({ requests: 10, failed: 0 });
    // Every table the warm-up fetches belongs to a curated site or is a DSN table: all of them are pinned.
    expect(await readdir(join(cacheDir, 'pinned'))).toHaveLength(10);
    expect(lines).toEqual(['warm-up: 10 of 10 Horizons tables cached']);

    const api = createApp({ horizons, sites: IM2, now: () => 0 });
    const res = await api.request(`/api/v1/sites/im2-athena?from=${WARM_FROM}&to=${WARM_TO}`);
    expect(res.status).toBe(200);
    expect(fetch.calls).toHaveLength(10);
  });

  it('sends a request shared by several sites once', async () => {
    const twin = { ...IM2[0]!, id: 'im2-twin', lat: -84.7911, lonEast: 29.1999 };
    const fetch = fixtureFetch();
    const result = await warmCache({
      horizons: createHorizonsClient({ fetch, cacheDir }),
      sites: [...IM2, twin],
      log: () => undefined,
    });
    expect(result.requests).toBe(10);
    expect(fetch.calls).toHaveLength(10);
  });

  it('keeps at most 2 Horizons requests in flight', async () => {
    const served = fixtureFetch();
    let inFlight = 0;
    let peak = 0;
    const fetch = async (url: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return served(url);
    };
    const result = await warmCache({ horizons: createHorizonsClient({ fetch, cacheDir }), sites: SITES, log: () => undefined });
    expect(result.requests).toBeGreaterThan(4);
    expect(peak).toBe(2);
  });

  it('logs failures and resolves instead of throwing', async () => {
    const lines: string[] = [];
    const result = await warmCache({
      horizons: createHorizonsClient({ fetch: fixedFetch(503, 'Service Unavailable'), cacheDir, sleep: async () => undefined }),
      sites: SITES.slice(0, 3),
      log: (line) => lines.push(line),
    });
    expect(result.failed).toBe(result.requests);
    expect(lines.filter((line) => line.includes('HTTP 503'))).toHaveLength(result.requests);
    expect(lines.at(-1)).toBe(`warm-up: 0 of ${result.requests} Horizons tables cached`);
    expect(await readdir(cacheDir)).toHaveLength(0);
  });

  it('retries a table refused as busy after a delay', async () => {
    const real = createHorizonsClient({ fetch: fixtureFetch(), cacheDir });
    let refusals = 2;
    const horizons: HorizonsClient = {
      raw: real.raw,
      rows: async (query, call) => {
        if (refusals-- > 0) throw new HorizonsError('busy', 'too many Horizons downloads waiting');
        return real.rows(query, call);
      },
    };
    const waits: number[] = [];
    const result = await warmCache({ horizons, sites: IM2, log: () => undefined, sleep: async (ms) => void waits.push(ms) });
    expect(result).toEqual({ requests: 10, failed: 0 });
    expect(waits).toEqual([WARM_BUSY_DELAY_MS, WARM_BUSY_DELAY_MS]);
  });

  it('gives up on a table still busy after the last retry', async () => {
    let calls = 0;
    const horizons: HorizonsClient = {
      raw: async () => '',
      rows: async () => {
        calls += 1;
        throw new HorizonsError('busy', 'too many Horizons downloads waiting');
      },
    };
    const lines: string[] = [];
    const waits: number[] = [];
    const result = await warmCache({
      horizons,
      sites: IM2,
      log: (line) => lines.push(line),
      sleep: async (ms) => void waits.push(ms),
    });
    expect(result).toEqual({ requests: 10, failed: 10 });
    expect(calls).toBe(10 * (WARM_BUSY_RETRIES + 1));
    expect(waits).toHaveLength(10 * WARM_BUSY_RETRIES);
    expect(lines.filter((line) => line.includes('too many Horizons downloads waiting'))).toHaveLength(10);
  });

  it('does not retry a table that failed for another reason', async () => {
    const waits: number[] = [];
    const result = await warmCache({
      horizons: createHorizonsClient({ fetch: fixedFetch(400, '{"error":"bad"}'), cacheDir, sleep: async () => undefined }),
      sites: IM2,
      log: () => undefined,
      sleep: async (ms) => void waits.push(ms),
    });
    expect(result.failed).toBe(10);
    expect(waits).toEqual([]);
  });
});
