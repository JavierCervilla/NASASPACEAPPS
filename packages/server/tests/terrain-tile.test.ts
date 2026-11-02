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
 * The height tile service and the /terrain/tile route (VENT-34) over the
 * synthetic terrain of terrain-fixture.ts: a 500 m crater wall on a 20 m
 * polar grid, and a coarse tiled globe.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeHeights } from '@ventana/sim';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { createMissLimiter } from '../src/miss-limiter.ts';
import { TerrainNotInstalledError } from '../src/terrain/horizon-cache.ts';
import { TerrainBusyError } from '../src/terrain/gate.ts';
import { TerrainService, TerrainUncoveredError } from '../src/terrain/terrain-service.ts';
import { tileIn } from '../src/terrain/tile-rounds.ts';
import { cachedTiles, tileKey, type TileSource } from '../src/terrain/tile-cache.ts';
import { parseTileParams, DEFAULT_TILE_SIZE_M } from '../src/terrain/tile-route.ts';
import type { TileAnswer } from '../src/terrain/tile-answer.ts';
import { CATALOGUE, CRATER, SOUTH, terrainDir, tileDn } from './terrain-fixture.ts';

let dir: string;
beforeAll(async () => {
  dir = await terrainDir();
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function open(opts: { cacheBytes?: number; maxWaiting?: number; catalogue?: typeof CATALOGUE; dir?: string } = {}) {
  return TerrainService.open({
    dir: opts.dir ?? dir,
    catalogue: opts.catalogue ?? CATALOGUE,
    cacheBytes: opts.cacheBytes ?? 64 * 2 ** 20,
    maxRunning: 1,
    maxWaiting: opts.maxWaiting ?? 4,
  });
}

const N = 257;
const CRATER_POINT = { lat: CRATER.lat, lonEast: CRATER.lonEast, sizeM: 4_000 };

describe('tileIn', () => {
  it('reads the finest tier: the crater floor in the middle, the 500 m wall at the corners', async () => {
    const service = await open();
    const answer = await tileIn(service, CRATER_POINT);
    const heights = decodeHeights(answer.heights);
    expect(answer).toMatchObject({ n: N, sizeM: 4_000, groundM: 0, resolutionM: 20, coverage: 1 });
    expect(heights).toHaveLength(N * N);
    expect(heights[128 * N + 128]).toBe(0);
    expect(heights[0]).toBe(500);
    expect(heights[N * N - 1]).toBe(500);
    expect(answer.tiers).toEqual([{ id: 'south-20m', resolutionM: 20, share: 1 }]);
    await service.close();
  });

  it('answers anywhere from the globe, with its tile height as the ground', async () => {
    const service = await open();
    const answer = await tileIn(service, { lat: 10, lonEast: 100, sizeM: 4_000 });
    expect(answer.groundM).toBe(tileDn(0, 1) * 0.5);
    expect(answer.resolutionM).toBe(10_000);
    expect(answer.tiers.map((t) => t.id)).toEqual(['globe-coarse']);
    await service.close();
  });

  it('answers across the 0° E seam of the tiled globe', async () => {
    const service = await open();
    const answer = await tileIn(service, { lat: 60, lonEast: 0, sizeM: 8_000 });
    expect(answer.coverage).toBe(1);
    expect(answer.groundM).toBe(((tileDn(0, 3) + tileDn(0, 0)) / 2) * 0.5);
    expect(decodeHeights(answer.heights).every(Number.isFinite)).toBe(true);
    await service.close();
  });

  it('gives the same answer with a block cache of a single block', async () => {
    const roomy = await open();
    const tight = await open({ cacheBytes: 128 * 1024 });
    expect(await tileIn(tight, CRATER_POINT)).toEqual(await tileIn(roomy, CRATER_POINT));
    await Promise.all([roomy.close(), tight.close()]);
  });

  it('refuses a point no tier present covers', async () => {
    const southOnly = { ...CATALOGUE, tiers: [SOUTH], bands: [] };
    const service = await open({ catalogue: southOnly });
    await expect(tileIn(service, { lat: 0, lonEast: 0, sizeM: 4_000 })).rejects.toThrow(TerrainUncoveredError);
    await service.close();
  });

  it('shares the computation gate: past its queue it is busy', async () => {
    const service = await open({ maxWaiting: 0 });
    const first = tileIn(service, CRATER_POINT);
    await expect(tileIn(service, CRATER_POINT)).rejects.toThrow(TerrainBusyError);
    await first;
    await service.close();
  });

  it('is small: the answer stays within its byte budget', async () => {
    const service = await open();
    const bytes = Buffer.byteLength(JSON.stringify(await tileIn(service, CRATER_POINT)));
    // 257 x 257 x 4 bytes in base64 plus a few hundred of fields.
    expect(bytes).toBeGreaterThan(N * N * 4 * (4 / 3));
    expect(bytes).toBeLessThan(360_000);
    await service.close();
  });
});

describe('cachedTiles', () => {
  it('computes a tile once and then reads it from disk', async () => {
    const service = await open();
    const cache = await mkdtemp(join(tmpdir(), 'tile-cache-'));
    let misses = 0;
    const a = await cachedTiles(service, cache, 2 ** 22).tile(CRATER_POINT, () => misses++);
    const b = await cachedTiles(service, cache, 2 ** 22).tile(CRATER_POINT, () => misses++);
    expect(b).toEqual(a);
    expect(misses).toBe(1);
    await service.close();
    await rm(cache, { recursive: true, force: true });
  });

  it('keys by point, size and the tiers present', () => {
    const base = tileKey(CRATER_POINT, 'a+b');
    expect(tileKey({ ...CRATER_POINT, sizeM: 2_000 }, 'a+b')).not.toBe(base);
    expect(tileKey(CRATER_POINT, 'a')).not.toBe(base);
    expect(tileKey({ ...CRATER_POINT, lat: -85 }, 'a+b')).not.toBe(base);
  });

  it('says the terrain is not installed when no tier is on disk', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'tile-empty-'));
    const service = await open({ dir: empty });
    const source = cachedTiles(service, join(empty, 'cache'), 2 ** 20);
    await expect(source.tile(CRATER_POINT)).rejects.toThrow(TerrainNotInstalledError);
    await service.close();
    await rm(empty, { recursive: true, force: true });
  });
});

describe('parseTileParams', () => {
  it('rounds the point to the 0.01° grid and defaults the size to 4 km', () => {
    expect(parseTileParams({ lat: '-85.504', lon: '31.006' })).toEqual({ lat: -85.5, lonEast: 31.01, sizeM: DEFAULT_TILE_SIZE_M });
    expect(DEFAULT_TILE_SIZE_M).toBe(4_000);
  });

  it('takes only the sizes on offer', () => {
    for (const size of ['2000', '4000', '8000']) {
      expect(parseTileParams({ lat: '0', lon: '0', size }).sizeM).toBe(Number(size));
    }
    for (const size of ['3000', '0', '-2000', 'abc', '', '16000']) {
      expect(() => parseTileParams({ lat: '0', lon: '0', size })).toThrow(/size/);
    }
  });
});

describe('GET /api/v1/terrain/tile', () => {
  const NOW = Date.UTC(2026, 10, 14);
  const ANSWER: TileAnswer = {
    lat: 0, lonEast: 0, sizeM: 4_000, n: N, groundM: 0, heights: '', resolutionM: 59, tiers: [], coverage: 1,
  };
  const fake: TileSource = {
    async tile(point, onMiss) {
      onMiss?.();
      return { ...ANSWER, lat: point.lat, lonEast: point.lonEast, sizeM: point.sizeM };
    },
  };
  const failing = (error: Error): TileSource => ({ tile: () => Promise.reject(error) });

  function api(tiles: TileSource | undefined, options: { limit?: number; lines?: string[] } = {}) {
    const horizons = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: tmpdir() });
    const missLimiter = createMissLimiter({ limit: options.limit ?? 30, now: () => NOW });
    const log = (line: string) => options.lines?.push(line);
    return createApp({ horizons, pointsCache: horizons.points, sites: [], now: () => NOW, missLimiter, tiles, log });
  }
  const URL_OK = '/api/v1/terrain/tile?lat=-85.504&lon=31.006';

  it('answers the point on the grid with the default size and a day of cache', async () => {
    const res = await api(fake).request(URL_OK);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
    expect(await res.json()).toMatchObject({ lat: -85.5, lonEast: 31.01, sizeM: 4_000, n: N });
  });

  it('refuses a bad point or size with 400', async () => {
    for (const q of ['lat=-91&lon=0', 'lat=0', 'lat=0&lon=0&size=3000', 'lat=0&lon=361']) {
      expect((await api(fake).request(`/api/v1/terrain/tile?${q}`)).status).toBe(400);
    }
  });

  it('answers 503 «terrain data is not installed» on a server without terrain', async () => {
    const res = await api(undefined).request(URL_OK);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'terrain data is not installed' });
  });

  it('answers 503 the same way while no tier is on disk', async () => {
    const res = await api(failing(new TerrainNotInstalledError())).request(URL_OK);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'terrain data is not installed' });
  });

  it('answers 404 where no tier covers the point, and logs the error line', async () => {
    const lines: string[] = [];
    const res = await api(failing(new TerrainUncoveredError('x')), { lines }).request(URL_OK);
    expect(res.status).toBe(404);
    expect(lines).toEqual(['api error: GET /api/v1/terrain/tile 404 0 ms']);
  });

  it('answers 503 with Retry-After when the queue is full', async () => {
    const res = await api(failing(new TerrainBusyError())).request(URL_OK);
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('10');
  });

  it('counts computations against the per-address miss limit', async () => {
    const limited = api(fake, { limit: 1 });
    expect((await limited.request('/api/v1/terrain/tile?lat=0&lon=0')).status).toBe(200);
    const second = await limited.request('/api/v1/terrain/tile?lat=0&lon=1');
    expect(second.status).toBe(429);
    expect(second.headers.get('retry-after')).not.toBeNull();
  });

  it('serves a real tile end to end through the disk cache', async () => {
    const service = await open();
    const cache = await mkdtemp(join(tmpdir(), 'tile-api-'));
    const res = await api(cachedTiles(service, cache, 2 ** 22)).request(
      `/api/v1/terrain/tile?lat=${CRATER.lat}&lon=${CRATER.lonEast}&size=2000`,
    );
    const body = (await res.json()) as TileAnswer;
    expect(res.status).toBe(200);
    expect(decodeHeights(body.heights)).toHaveLength(N * N);
    expect(body.resolutionM).toBe(20);
    await service.close();
    await rm(cache, { recursive: true, force: true });
  });
});
