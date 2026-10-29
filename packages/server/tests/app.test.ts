import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Ephemeris, Site } from '@ventana/sim';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient, type FetchLike } from '../src/horizons/client.ts';
import { DEFAULT_SITES_FILE, loadSites } from '../src/sites.ts';
import { fixedFetch, fixtureFetch } from './fake-horizons.ts';

const NOW = Date.UTC(2026, 10, 14, 9, 30);
const SITES: Site[] = await loadSites(DEFAULT_SITES_FILE);
const POINT = '/api/ephemeris?lat=-89.5&lon=0';

let cacheDir: string;
beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'horizons-app-'));
});

function app(fetch: FetchLike) {
  return createApp({ horizons: createHorizonsClient({ fetch, cacheDir }), sites: SITES, now: () => NOW });
}

describe('GET /api/health', () => {
  it('answers ok', async () => {
    const res = await app(fixtureFetch()).request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('GET /api/ephemeris', () => {
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
    expect((await app(fetch).request('/api/ephemeris?lat=x')).status).toBe(400);
    expect(fetch.calls).toHaveLength(0);
  });

  it('answers 502 when Horizons fails', async () => {
    const res = await app(fixedFetch(503, 'Service Unavailable')).request(`${POINT}&from=2026-11-01&to=2026-11-02`);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'JPL Horizons did not return the ephemeris; try again later' });
  });
});

describe('GET /api/sites', () => {
  it('lists the sites of the sites file', async () => {
    const res = await app(fixtureFetch()).request('/api/sites');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sites: SITES });
  });

  it('answers one site, and its ephemeris when given a range', async () => {
    const api = app(fixtureFetch());
    expect(await (await api.request('/api/sites/south-pole-89-5')).json()).toEqual({ site: SITES[0] });
    const res = await api.request('/api/sites/south-pole-89-5?from=2026-12-01&to=2026-12-01');
    const body = (await res.json()) as { site: Site; ephemeris: Ephemeris };
    expect(body.site.id).toBe('south-pole-89-5');
    expect(body.ephemeris.hours).toHaveLength(24);
  });

  it('answers 404 for an unknown site and 400 for half a range', async () => {
    const api = app(fixtureFetch());
    expect((await api.request('/api/sites/nowhere')).status).toBe(404);
    expect((await api.request('/api/sites/south-pole-89-5?from=2026-12-01')).status).toBe(400);
  });
});
