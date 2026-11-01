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
 * The terrain service and the /horizon route (VENT-40) over a tiny
 * synthetic terrain written to a temporary directory: a 500 m crater wall
 * at the south pole on a 20 m polar grid, and a coarse tiled globe.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeProfile, demHeightAt, horizonAt } from '@ventana/sim';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { createMissLimiter } from '../src/miss-limiter.ts';
import { DEFAULT_CATALOGUE_FILE, loadCatalogue } from '../src/terrain/catalogue.ts';
import { Gate, TerrainBusyError } from '../src/terrain/gate.ts';
import { cachedHorizons, type HorizonSource } from '../src/terrain/horizon-cache.ts';
import { parseHorizonParams } from '../src/terrain/horizon-route.ts';
import { TerrainService, TerrainUncoveredError, type HorizonAnswer } from '../src/terrain/terrain-service.ts';
import { TierGrid } from '../src/terrain/tier-grid.ts';
import { BlockReader } from '../src/terrain/block-reader.ts';
import { CATALOGUE, CRATER, GLOBE, SOUTH, terrainDir, tileDn } from './terrain-fixture.ts';

let dir: string;
beforeAll(async () => {
  dir = await terrainDir();
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function open(cacheBytes = 64 * 2 ** 20, catalogue = CATALOGUE): Promise<TerrainService> {
  return TerrainService.open({ dir, catalogue, cacheBytes, maxRunning: 1, maxWaiting: 4 });
}

/** The unit vector of a latitude and an east longitude, degrees. */
function unitVectorOf(lat: number, lon: number): [number, number, number] {
  const [a, b] = [(lat * Math.PI) / 180, (lon * Math.PI) / 180];
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)];
}

const WALL_DEG = (Math.atan(498 / 1_000) * 180) / Math.PI;

describe('TerrainService', () => {
  it('finds the tiers on disk and only those', async () => {
    const service = await open();
    expect(service.present.map((t) => t.id)).toEqual(['south-20m', 'globe-coarse']);
    const empty = await TerrainService.open({ dir: tmpdir(), catalogue: CATALOGUE, cacheBytes: 1, maxRunning: 1, maxWaiting: 1 });
    expect(empty.present).toEqual([]);
    await service.close();
  });

  it('sees the crater wall all round, and names the tiers that served the rays', async () => {
    const service = await open();
    const answer = await service.horizon(CRATER);
    const profile = decodeProfile(answer.profile);
    for (const az of [0, 120, 300]) {
      expect(horizonAt(profile, az)).toBeLessThanOrEqual(WALL_DEG);
      expect(horizonAt(profile, az)).toBeGreaterThan(WALL_DEG - 0.6);
    }
    expect(answer.bins).toBe(720);
    expect(answer.groundM).toBe(0);
    expect(answer.tiers.map((t) => t.id)).toEqual(['south-20m', 'globe-coarse']);
    expect(answer.tiers.reduce((sum, t) => sum + t.share, 0)).toBeCloseTo(1, 6);
    await service.close();
  });

  it('gives the same answer with a block cache of a single block', async () => {
    const roomy = await open();
    const tight = await open(128 * 1024);
    expect(await tight.horizon(CRATER)).toEqual(await roomy.horizon(CRATER));
    expect(tight.blocks.cachedBytes()).toBeLessThanOrEqual(128 * 1024);
    await Promise.all([roomy.close(), tight.close()]);
  });

  it('answers anywhere from the globe when the polar grid does not cover it', async () => {
    const service = await open();
    const answer = await service.horizon({ lat: 10, lonEast: 100, heightM: 2 });
    expect(answer.tiers.map((t) => t.id)).toEqual(['globe-coarse']);
    expect(answer.groundM).toBe(tileDn(0, 1) * 0.5);
    await service.close();
  });

  it('refuses a point no tier present covers', async () => {
    const southOnly = { ...CATALOGUE, tiers: [SOUTH], bands: CATALOGUE.bands.map((b) => ({ ...b, tiers: b.tiers.filter((id) => id === SOUTH.id) })) };
    const service = await open(64 * 2 ** 20, southOnly);
    await expect(service.horizon({ lat: 0, lonEast: 0, heightM: 2 })).rejects.toThrow(TerrainUncoveredError);
    await service.close();
  });
});

describe('BlockReader and TierGrid', () => {
  it('read each tile of a tiled tier at its place in the grid', async () => {
    const reader = new BlockReader(dir);
    const grid = new TierGrid(GLOBE);
    for (const [row, col, lat, lon] of [[0, 0, 45, 45], [0, 3, 1, 359], [1, 2, -80, 200]] as const) {
      const p = unitVectorOf(lat, lon);
      grid.probing = true;
      demHeightAt(grid.grid, p);
      for (const key of grid.missing) grid.blocks.set(key, await reader.read(GLOBE, key));
      grid.missing.clear();
      grid.probing = false;
      expect(demHeightAt(grid.grid, p)).toBe(tileDn(row, col) * 0.5);
    }
    await reader.close();
  });
});

describe('Gate', () => {
  it('runs at most its cap at once and refuses past its queue', async () => {
    const gate = new Gate(1, 1);
    let release: () => void = () => undefined;
    const first = gate.run(() => new Promise<void>((resolve) => (release = resolve)));
    const second = gate.run(async () => 'second');
    await expect(gate.run(async () => 'third')).rejects.toThrow(TerrainBusyError);
    release();
    await first;
    expect(await second).toBe('second');
  });
});

describe('cachedHorizons', () => {
  it('computes a point once and then reads it from disk', async () => {
    const service = await open();
    const cache = await mkdtemp(join(tmpdir(), 'terrain-cache-'));
    let misses = 0;
    const source = cachedHorizons(service, cache, 2 ** 20);
    const a = await source.horizon(CRATER, () => misses++);
    const b = await cachedHorizons(service, cache, 2 ** 20).horizon(CRATER, () => misses++);
    expect(b).toEqual(a);
    expect(misses).toBe(1);
    await service.close();
  });
});

describe('the shipped catalogue', () => {
  it('loads, and every band names its tiers', async () => {
    const catalogue = await loadCatalogue(DEFAULT_CATALOGUE_FILE);
    expect(catalogue.tiers.length).toBe(9);
    expect(catalogue.bands.map((b) => b.untilM)).toEqual([6_000, 150_000, 200_000]);
  });

  it("matches the shipped profiles' header, file for file (terrain-horizons.ts --check without the grids)", async () => {
    const catalogue = await loadCatalogue(DEFAULT_CATALOGUE_FILE);
    const shipped = JSON.parse(
      await readFile(new URL('../../sim/data/horizons.json', import.meta.url), 'utf8'),
    ) as { sources: { tier: string; sha256: string | null }[] };
    expect(shipped.sources.length).toBeGreaterThan(0);
    for (const { tier, ...file } of shipped.sources) {
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(catalogue.tiers.find((t) => t.id === tier)?.files[0]).toEqual(file);
    }
  });
});

describe('GET /api/v1/horizon', () => {
  const NOW = Date.UTC(2026, 10, 14);
  const ANSWER = { lat: -85.5, lonEast: 31, heightM: 2, bins: 720, profile: '', groundM: 0, coverage: 1, tiers: [] };
  const fake: HorizonSource = {
    async horizon(point, onMiss) {
      onMiss?.();
      return { ...ANSWER, ...point } as HorizonAnswer;
    },
  };

  function api(terrain: HorizonSource | undefined, limit = 30) {
    const horizons = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: tmpdir() });
    const missLimiter = createMissLimiter({ limit, now: () => NOW });
    return createApp({ horizons, pointsCache: horizons.points, sites: [], now: () => NOW, missLimiter, terrain });
  }

  it('answers the point on the 0.01° grid, at 2 m by default', async () => {
    const res = await api(fake).request('/api/v1/horizon?lat=-85.504&lon=31.006');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ lat: -85.5, lonEast: 31.01, heightM: 2 });
  });

  it('takes a height in metres, rounded to 0.1 m', async () => {
    const res = await api(fake).request('/api/v1/horizon?lat=0&lon=0&height=15.96');
    expect(await res.json()).toMatchObject({ heightM: 16 });
  });

  it('refuses a bad point or height with 400', async () => {
    for (const q of ['lat=-91&lon=0', 'lat=0', 'lat=0&lon=0&height=-1', 'lat=0&lon=0&height=101']) {
      expect((await api(fake).request(`/api/v1/horizon?${q}`)).status).toBe(400);
    }
  });

  it('answers 503 on a server without terrain', async () => {
    expect((await api(undefined).request('/api/v1/horizon?lat=0&lon=0')).status).toBe(503);
  });

  it('counts computations against the per-address miss limit', async () => {
    const limited = api(fake, 1);
    expect((await limited.request('/api/v1/horizon?lat=0&lon=0')).status).toBe(200);
    expect((await limited.request('/api/v1/horizon?lat=0&lon=1')).status).toBe(429);
  });

  it('parses like the ephemeris route', () => {
    expect(parseHorizonParams({ lat: '-89.996', lon: '359.999' })).toEqual({ lat: -90, lonEast: 360, heightM: 2 });
  });
});
