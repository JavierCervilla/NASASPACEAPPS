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
 * A flood of uncached levelled tiles from one address (VENT-46, Seguridad's
 * finding): it must not fill the horizon's queue, and it is held to a few
 * computations in flight per address.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tileGeoref, type TileKey } from '@ventana/sim';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { createMissLimiter } from '../src/miss-limiter.ts';
import { cachedHorizons } from '../src/terrain/horizon-cache.ts';
import type { LodAnswer } from '../src/terrain/lod-answer.ts';
import { cachedLod, type LodSource } from '../src/terrain/lod-cache.ts';
import { TerrainService, TerrainUncoveredError } from '../src/terrain/terrain-service.ts';
import { CATALOGUE, CRATER, SOUTH, terrainDir } from './terrain-fixture.ts';

const NOW = Date.UTC(2026, 10, 14);
const TILE = (x: number, y = 0) => `/api/v1/terrain/tiles/polar-south/0/${x}/${y}`;
/** The app's answer, always as a promise. */
const request = async (api: ReturnType<typeof apiOver>, path: string, init?: RequestInit) =>
  api.request(path, init);
const from = (ip: string) => ({ headers: { 'x-forwarded-for': ip } });
const HORIZON = `/api/v1/horizon?lat=${CRATER.lat}&lon=${CRATER.lonEast}`;

let dir: string;
let work: string;
beforeAll(async () => {
  dir = await terrainDir();
  work = await mkdtemp(join(tmpdir(), 'lod-flood-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(work, { recursive: true, force: true });
});

function apiOver(source: LodSource | undefined, horizons?: ReturnType<typeof cachedHorizons>) {
  const client = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: tmpdir() });
  const lodLimiter = createMissLimiter({ limit: 100_000, now: () => NOW });
  return createApp({
    horizons: client, pointsCache: client.points, sites: [], now: () => NOW,
    terrain: horizons, lod: source, lodLimiter, log: () => undefined,
  });
}

describe('a flood of uncached tiles from one address', () => {
  it('leaves /horizon answering for everybody else', async () => {
    const service = await TerrainService.open({
      dir, catalogue: CATALOGUE, cacheBytes: 2 ** 26,
      maxRunning: 1, maxWaiting: 1, lodMaxRunning: 1, lodMaxWaiting: 1,
    } as Parameters<typeof TerrainService.open>[0]);
    const cache = await mkdtemp(join(work, 'a-'));
    const lod = cachedLod(service, join(cache, 'lod'), 2 ** 24);
    const api = apiOver(lod, cachedHorizons(service, join(cache, 'h'), 2 ** 24));
    const statuses: number[] = [];
    const flood = Array.from({ length: 36 }, (_, i) =>
      request(api, TILE((i % 6) - 3, Math.floor(i / 6) - 3), from('198.51.100.9')).then((r) => statuses.push(r.status)),
    );
    // The gate is full once the flood is being turned away.
    await vi.waitFor(() => expect(statuses).toContain(503));
    const horizon = await request(api, HORIZON, from('203.0.113.5'));
    expect(horizon.status).toBe(200);
    await Promise.all(flood);
    await service.close();
  });
});

describe('the cap on computations in flight per address', () => {
  const N = 129;
  const held: (() => void)[] = [];
  const answerFor = (key: TileKey): LodAnswer => ({
    version: 'abcd1234', scheme: key.scheme, level: key.level, x: key.x, y: key.y, n: N,
    georef: tileGeoref(key), quantumM: 0.1, baseUnits: 0, noData: 65_535, heights: '',
    minM: 0, maxM: 0, resolutionM: 59, tiers: [], coverage: 1,
  });
  // The shape of cachedLod: the slot first, the miss counted, the work, the release.
  const fake: LodSource = {
    version: () => 'abcd1234',
    async tile(key, onMiss, slot) {
      const release = await slot?.();
      try {
        onMiss?.();
        await new Promise<void>((resolve) => held.push(resolve));
        return answerFor(key);
      } finally {
        release?.();
      }
    },
  };

  async function drain(pending: Promise<unknown>[]): Promise<void> {
    let open = true;
    void Promise.all(pending).then(() => (open = false));
    while (open) {
      held.splice(0).forEach((resolve) => resolve());
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  it('runs 4 at once, lets 4 more wait and refuses the ninth with 429 and Retry-After', async () => {
    const api = apiOver(fake);
    const statuses: number[] = [];
    const retryAfter: (string | null)[] = [];
    const calls = Array.from({ length: 9 }, (_, x) =>
      request(api, TILE(x), from('198.51.100.9')).then((r) => {
        statuses.push(r.status);
        if (r.status === 429) retryAfter.push(r.headers.get('retry-after'));
      }),
    );
    await vi.waitFor(() => expect(statuses).toEqual([429]));
    expect(held).toHaveLength(4);
    expect(retryAfter).toEqual(['1']);
    // Another address has a room of its own.
    const other = request(api, TILE(20), from('203.0.113.5'));
    await vi.waitFor(() => expect(held).toHaveLength(5));
    await drain([...calls, other]);
    expect(statuses.filter((s) => s === 200)).toHaveLength(8);
    // Everything was given back: the same address computes again.
    const again = request(api, TILE(30), from('198.51.100.9')).then((r) => r.status);
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await drain([again]);
    expect(await again).toBe(200);
  });
});

describe('cachedLod and the slot', () => {
  async function source(catalogue = CATALOGUE) {
    const service = await TerrainService.open({ dir, catalogue, cacheBytes: 2 ** 26, maxRunning: 1, maxWaiting: 4 });
    const cache = await mkdtemp(join(work, 'c-'));
    return { service, lod: cachedLod(service, cache, 2 ** 22) };
  }
  const KEY: TileKey = { scheme: 'polar-south', level: 0, x: 0, y: 0 };

  function slotCounter() {
    const calls = { taken: 0, released: 0 };
    const slot = async () => {
      calls.taken++;
      return () => void calls.released++;
    };
    return { calls, slot };
  }

  it('takes a slot for a computation and gives it back after', async () => {
    const { service, lod } = await source();
    const { calls, slot } = slotCounter();
    await lod.tile(KEY, undefined, slot);
    expect(calls).toEqual({ taken: 1, released: 1 });
    await service.close();
  });

  it('takes none when the tile is on disk', async () => {
    const { service, lod } = await source();
    await lod.tile(KEY);
    const { calls, slot } = slotCounter();
    await lod.tile(KEY, undefined, slot);
    expect(calls).toEqual({ taken: 0, released: 0 });
    await service.close();
  });

  it('gives it back when the computation fails or the miss is refused', async () => {
    const { service, lod } = await source({ ...CATALOGUE, tiers: [SOUTH], bands: [] });
    const { calls, slot } = slotCounter();
    const off: TileKey = { scheme: 'latlon', level: 0, x: 0, y: 0 };
    await expect(lod.tile(off, undefined, slot)).rejects.toThrow(TerrainUncoveredError);
    const refuse = () => { throw new Error('over the limit'); };
    await expect(lod.tile(KEY, refuse, slot)).rejects.toThrow('over the limit');
    expect(calls).toEqual({ taken: 2, released: 2 });
    await service.close();
  });
});
