import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { clientIp } from '../src/client-ip.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { limitMisses } from '../src/miss-limiter.ts';
import { fixtureFetch } from './fake-horizons.ts';

vi.mock('../src/client-ip.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/client-ip.ts')>();
  return { clientIp: vi.fn(real.clientIp) };
});

const POINT = '/api/v1/ephemeris?lat=-89.5&lon=0&from=2026-11-01&to=2026-11-01';

describe('client IP', () => {
  it('is worked out once, and only for a cache miss', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'horizons-ip-'));
    const horizons = createHorizonsClient({ fetch: fixtureFetch(), cacheDir });
    const api = createApp({ horizons, pointsCache: horizons.points, sites: [], now: () => 0 });
    expect((await api.request(POINT)).status).toBe(200);
    // One month of one point: five tables, five misses, one client.
    expect(vi.mocked(clientIp)).toHaveBeenCalledTimes(1);
    vi.mocked(clientIp).mockClear();
    expect((await api.request(POINT)).status).toBe(200);
    expect(vi.mocked(clientIp)).not.toHaveBeenCalled();
  });

  it('is asked of the key function only when the hook runs', () => {
    const key = vi.fn(() => '203.0.113.7');
    const keys: string[] = [];
    const onMiss = limitMisses({ take: (k) => (keys.push(k), 0), size: () => 0 }, key);
    expect(key).not.toHaveBeenCalled();
    onMiss();
    onMiss();
    expect(keys).toEqual(['203.0.113.7', '203.0.113.7']);
    expect(key).toHaveBeenCalledTimes(1);
  });
});
