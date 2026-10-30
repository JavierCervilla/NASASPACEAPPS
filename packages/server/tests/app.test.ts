import { mkdtemp, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Ephemeris, Site } from '@ventana/sim';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createMissLimiter, type MissLimiter } from '../src/miss-limiter.ts';
import { createHorizonsClient, type FetchLike, type HorizonsClientOptions } from '../src/horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from '../src/sites.ts';
import { fixedFetch, fixtureFetch } from './fake-horizons.ts';

const NOW = Date.UTC(2026, 10, 14, 9, 30);
const SITES: Site[] = await loadSites(DEFAULT_SITES_FILE);
const POINT = '/api/v1/ephemeris?lat=-89.5&lon=0';

let cacheDir: string;
beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'horizons-app-'));
});

function app(fetch: FetchLike, extra: { client?: Partial<HorizonsClientOptions>; missLimiter?: MissLimiter } = {}) {
  const horizons = createHorizonsClient({ fetch, cacheDir, sleep: async () => undefined, ...extra.client });
  return createApp({ horizons, pointsCache: horizons.points, sites: SITES, now: () => NOW, ...(extra.missLimiter ? { missLimiter: extra.missLimiter } : {}) });
}

const NOV_1 = '&from=2026-11-01&to=2026-11-01';
const ATHENA = '/api/v1/ephemeris?lat=-84.79&lon=29.2';

describe('GET /api/v1/health', () => {
  it('answers ok with the points cache at 0 bytes before its first scan', async () => {
    const res = await app(fixtureFetch(), { client: { maxPointsBytes: 4096 } }).request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, cache: { pointsBytes: 0, pointsCapBytes: 4096 } });
  });

  it('reports the bytes of the custom-point tables, and only those numbers', async () => {
    const api = app(fixtureFetch(), { client: { maxPointsBytes: 64 * 1024 * 1024 } });
    expect((await api.request(`${POINT}${NOV_1}`)).status).toBe(200);
    const dir = join(cacheDir, 'points');
    const files = await readdir(dir);
    const sizes = await Promise.all(files.map(async (name) => (await stat(join(dir, name))).size));
    const body = (await (await api.request('/api/v1/health')).json()) as { cache: { pointsBytes: number } };
    expect(body).toEqual({ ok: true, cache: { pointsBytes: sizes.reduce((a, b) => a + b, 0), pointsCapBytes: 64 * 1024 * 1024 } });
    expect(body.cache.pointsBytes).toBeGreaterThan(0);
  });

  it('copies only the two numbers from the injected store, never a path', async () => {
    const horizons = createHorizonsClient({ fetch: fixtureFetch(), cacheDir });
    const pointsCache = { usage: async () => ({ pointsBytes: 7, pointsCapBytes: 9, dir: '/var/cache/horizons/points' }) };
    const res = await createApp({ horizons, pointsCache, sites: SITES, now: () => NOW }).request('/api/v1/health');
    expect(await res.json()).toEqual({ ok: true, cache: { pointsBytes: 7, pointsCapBytes: 9 } });
  });

  it('has no unversioned alias', async () => {
    const api = app(fixtureFetch());
    for (const path of ['/api/health', '/api/sites', '/api/ephemeris']) expect((await api.request(path)).status).toBe(404);
  });
});

describe('GET /api/v1/ephemeris', () => {
  it('answers the hours, windows and metrics of a point', async () => {
    const res = await app(fixtureFetch()).request(`${POINT}&from=2026-11-01&to=2026-12-31`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/max-age/);
    const body = (await res.json()) as Ephemeris;
    expect(body.hours).toHaveLength(61 * 24);
    expect(body.from).toBe('2026-11-01T00:00:00Z');
    expect(body.to).toBe('2026-12-31T23:00:00Z');
    expect(body.hours[0]).toMatchObject({ t: '2026-11-01T00:00:00Z', sunEl: 1.587011, sunAz: 285.117929 });
    expect(body.metrics.sunPct).toBe(100);
    expect(body.metrics.at).toBe('2026-11-14T09:00:00Z');
    expect(body.windows.length).toBeGreaterThan(0);
    expect(body.source.url).toMatch(/ssd\.jpl\.nasa\.gov/);
  });

  it('slices a range inside a month, and reuses the cached month for the next request', async () => {
    const fetch = fixtureFetch();
    const api = app(fetch);
    const res = await api.request(`${POINT}&from=2026-11-10T05:00:00Z&to=2026-11-10T08:00:00Z`);
    const body = (await res.json()) as Ephemeris;
    expect(body.hours.map((h) => h.t)).toEqual([
      '2026-11-10T05:00:00Z',
      '2026-11-10T06:00:00Z',
      '2026-11-10T07:00:00Z',
      '2026-11-10T08:00:00Z',
    ]);
    // Sun, Earth and the three DSN complexes for November.
    expect(fetch.calls).toHaveLength(5);
    await api.request(`${POINT}&from=2026-11-20&to=2026-11-21`);
    expect(fetch.calls).toHaveLength(5);
  });

  it('answers 400 with the reason for invalid parameters, without calling Horizons', async () => {
    const fetch = fixtureFetch();
    const res = await app(fetch).request(`${POINT}&from=2026-11-01&to=2027-03-01`);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'the range must not be longer than 92 days' });
    expect((await app(fetch).request('/api/v1/ephemeris?lat=x')).status).toBe(400);
    expect(fetch.calls).toHaveLength(0);
  });

  it('rounds the point to the 0.01 degree grid, so nearby points share the cached tables', async () => {
    const fetch = fixtureFetch();
    const api = app(fetch);
    const first = (await (await api.request('/api/v1/ephemeris?lat=-84.7906&lon=29.1957&from=2026-11-01&to=2026-11-01')).json()) as Ephemeris;
    expect([first.lat, first.lonEast]).toEqual([-84.79, 29.2]);
    expect(fetch.calls).toHaveLength(5);
    const second = await api.request('/api/v1/ephemeris?lat=-84.7949&lon=29.2044&from=2026-11-02&to=2026-11-02');
    expect(second.status).toBe(200);
    expect(fetch.calls).toHaveLength(5);
  });

  it('answers 400 outside the supported dates, without calling Horizons', async () => {
    const fetch = fixtureFetch();
    const res = await app(fetch).request(`${POINT}&from=2028-01-01&to=2028-01-02`);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'the range must fall between 2026-01-01 and 2027-12-31' });
    expect(fetch.calls).toHaveLength(0);
  });

  it('answers 502 when Horizons fails', async () => {
    const res = await app(fixedFetch(503, 'Service Unavailable')).request(`${POINT}&from=2026-11-01&to=2026-11-02`);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'JPL Horizons did not return the ephemeris; try again later' });
  });
});

describe('Horizons protection', () => {
  it('answers 503 with Retry-After when the Horizons download queue is full', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const served = fixtureFetch();
    const fetch = async (url: string) => {
      await gate;
      return served(url);
    };
    // Counts the misses, so the test knows when the first request's downloads hold the slot and the queue.
    const limiter = createMissLimiter();
    let misses = 0;
    const missLimiter: MissLimiter = {
      take: (key) => {
        misses += 1;
        return limiter.take(key);
      },
      size: limiter.size,
    };
    const api = app(fetch, { client: { maxConcurrentDownloads: 1, maxQueuedDownloads: 3 }, missLimiter });
    const first = api.request(`${POINT}${NOV_1}`);
    // Four parallel jobs: one download running, three waiting, so the queue is full.
    while (misses < 4) await new Promise((resolve) => setTimeout(resolve, 1));
    const res = await api.request(`${ATHENA}&from=2026-12-01&to=2026-12-01`);
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('30');
    expect(await res.json()).toEqual({ error: 'the service is busy; try again later' });
    release();
    expect((await first).status).toBe(200);
  });

  it('does not count against a client the misses it was refused as busy', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const served = fixtureFetch();
    const fetch = async (url: string) => {
      await gate;
      return served(url);
    };
    // One month of one point is 5 Horizons tables: exactly this client's budget.
    const limiter = createMissLimiter({ limit: 5, now: () => NOW });
    let misses = 0;
    const missLimiter: MissLimiter = {
      take: (key) => {
        misses += 1;
        return limiter.take(key);
      },
      size: limiter.size,
    };
    const api = app(fetch, { client: { maxConcurrentDownloads: 1, maxQueuedDownloads: 3 }, missLimiter });
    const first = api.request(`${POINT}${NOV_1}`, { headers: { 'x-forwarded-for': '203.0.113.1' } });
    // Four parallel jobs: one download running, three waiting, so the queue is full.
    while (misses < 4) await new Promise((resolve) => setTimeout(resolve, 1));
    const busy = { headers: { 'x-forwarded-for': '203.0.113.2' } };
    expect((await api.request(`${ATHENA}&from=2026-12-01&to=2026-12-01`, busy)).status).toBe(503);
    release();
    expect((await first).status).toBe(200);
    expect((await api.request(`${ATHENA}&from=2026-12-01&to=2026-12-01`, busy)).status).toBe(200);
  });

  it('answers 429 with Retry-After once a client IP passes its cache misses, and still serves its cache hits', async () => {
    const clock = { ms: NOW };
    // One month of one point is 5 Horizons tables.
    const missLimiter = createMissLimiter({ limit: 5, windowMs: 600_000, now: () => clock.ms });
    const api = app(fixtureFetch(), { missLimiter });
    const from = (ip: string) => ({ headers: { 'x-forwarded-for': ip } });
    expect((await api.request(`${POINT}${NOV_1}`, from('203.0.113.7'))).status).toBe(200);
    const refused = await api.request(`${ATHENA}${NOV_1}`, from('203.0.113.7'));
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('600');
    expect(await refused.json()).toEqual({ error: 'too many new points from this address; try again later' });
    // Cache hits do not count.
    expect((await api.request(`${POINT}&from=2026-11-02&to=2026-11-02`, from('203.0.113.7'))).status).toBe(200);
    // The key is the right-most X-Forwarded-For entry, the one the proxy adds: a forged left entry does not help.
    expect((await api.request(`${ATHENA}${NOV_1}`, from('198.51.100.1, 203.0.113.7'))).status).toBe(429);
    expect((await api.request(`${ATHENA}${NOV_1}`, from('203.0.113.8'))).status).toBe(200);
    clock.ms += 600_000;
    expect((await api.request(`${ATHENA}&from=2026-12-01&to=2026-12-01`, from('203.0.113.7'))).status).toBe(200);
  });

  it('caches the DSN tables and the tables of curated sites in pinned/, any other point in points/', async () => {
    const api = app(fixtureFetch());
    expect((await api.request(`/api/v1/sites/im2-athena?from=2026-11-01&to=2026-11-01`)).status).toBe(200);
    expect(await readdir(join(cacheDir, 'pinned'))).toHaveLength(5);
    // A custom request on the rounded point of a curated site is pinned too.
    expect((await api.request(`/api/v1/ephemeris?lat=-84.7906&lon=29.1957&from=2026-12-01&to=2026-12-01`)).status).toBe(200);
    expect(await readdir(join(cacheDir, 'pinned'))).toHaveLength(10);
    expect((await api.request(`${POINT}${NOV_1}`)).status).toBe(200);
    expect(await readdir(join(cacheDir, 'points'))).toHaveLength(2);
    expect(await readdir(join(cacheDir, 'pinned'))).toHaveLength(10);
  });
});

describe('API headers', () => {
  const CSP = "default-src 'none'; frame-ancestors 'none'";

  it('sends nosniff and a restrictive CSP on every answer', async () => {
    const api = app(fixtureFetch());
    for (const path of ['/api/v1/health', '/api/v1/sites', '/api/v1/sites/nowhere', `${POINT}&from=2026-11-01&to=2027-03-01`]) {
      const res = await api.request(path);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('content-security-policy')).toBe(CSP);
    }
  });

  it('keeps an ephemeris for an hour, and never stores an error', async () => {
    const api = app(fixtureFetch());
    expect((await api.request(`${POINT}${NOV_1}`)).headers.get('cache-control')).toBe('public, max-age=3600');
    for (const path of ['/api/v1/sites/nowhere', '/api/v1/ephemeris?lat=x', '/api/v1/missing']) {
      const res = await api.request(path);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
    const failed = await app(fixedFetch(503, 'Service Unavailable')).request(`${POINT}&from=2026-12-01&to=2026-12-01`);
    expect(failed.status).toBe(502);
    expect(failed.headers.get('cache-control')).toBe('no-store');
  });
});

describe('createMissLimiter', () => {
  it('allows `limit` misses per key per window and says how long to wait', () => {
    const clock = { ms: 0 };
    const limiter = createMissLimiter({ limit: 2, windowMs: 10_000, now: () => clock.ms });
    expect(limiter.take('a')).toBe(0);
    expect(limiter.take('a')).toBe(0);
    clock.ms = 2500;
    expect(limiter.take('a')).toBe(8);
    expect(limiter.take('b')).toBe(0);
    clock.ms = 10_000;
    expect(limiter.take('a')).toBe(0);
  });

  it('stays bounded: expired keys are pruned and the oldest key goes when the map is full', () => {
    const clock = { ms: 0 };
    const limiter = createMissLimiter({ limit: 1, windowMs: 1000, now: () => clock.ms, maxKeys: 3 });
    for (const key of ['a', 'b', 'c', 'd']) limiter.take(key);
    expect(limiter.size()).toBe(3);
    clock.ms = 1000;
    limiter.take('e');
    expect(limiter.size()).toBe(1);
  });
});

describe('GET /api/v1/sites', () => {
  it('lists the sites of the sites file', async () => {
    const res = await app(fixtureFetch()).request('/api/v1/sites');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sites: SITES });
  });

  it('answers one site, and its ephemeris when given a range', async () => {
    const api = app(fixtureFetch());
    const im2 = SITES.find((s) => s.id === 'im2-athena');
    expect(await (await api.request('/api/v1/sites/im2-athena')).json()).toEqual({ site: im2 });
    const res = await api.request('/api/v1/sites/im2-athena?from=2026-12-01&to=2026-12-01');
    const body = (await res.json()) as { site: Site; ephemeris: Ephemeris };
    expect(body.site).toEqual(im2);
    // The site keeps its published coordinates; the ephemeris is computed on the API's 0.01 degree grid.
    expect([body.ephemeris.lat, body.ephemeris.lonEast]).toEqual([-84.79, 29.2]);
    expect(body.ephemeris.hours).toHaveLength(24);
  });

  it('answers 404 for an unknown site and 400 for half a range', async () => {
    const api = app(fixtureFetch());
    expect((await api.request('/api/v1/sites/nowhere')).status).toBe(404);
    expect((await api.request('/api/v1/sites/im2-athena?from=2026-12-01')).status).toBe(400);
  });
});
