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
 * The aligned, levelled height tiles (VENT-46): `GET /api/v1/terrain/tiles`
 * (which tiles cover a ring) and `/terrain/tiles/{scheme}/{level}/{x}/{y}`
 * (one tile), over the synthetic terrain of terrain-fixture.ts.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  decodeQuantised,
  tileContaining,
  tileGeoref,
  type TileKey,
} from '@ventana/sim';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { createMissLimiter } from '../src/miss-limiter.ts';
import { TerrainNotInstalledError } from '../src/terrain/horizon-cache.ts';
import { TerrainBusyError } from '../src/terrain/gate.ts';
import { TerrainService, TerrainUncoveredError } from '../src/terrain/terrain-service.ts';
import { tiersForLevel, type LodAnswer } from '../src/terrain/lod-answer.ts';
import { cachedLod, lodKey, lodVersion, type LodSource } from '../src/terrain/lod-cache.ts';
import { lodTileIn } from '../src/terrain/lod-rounds.ts';
import { parseIndexParams, parseTileKey } from '../src/terrain/lod-params.ts';
import { TILE_BUSY_RETRY_SEC } from '../src/terrain/lod-route.ts';
import { CATALOGUE, CRATER, GLOBE, SOUTH, terrainDir } from './terrain-fixture.ts';

let dir: string;
beforeAll(async () => {
  dir = await terrainDir();
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function open(opts: { maxWaiting?: number; lodMaxWaiting?: number; catalogue?: typeof CATALOGUE; dir?: string } = {}) {
  return TerrainService.open({
    dir: opts.dir ?? dir,
    catalogue: opts.catalogue ?? CATALOGUE,
    cacheBytes: 64 * 2 ** 20,
    maxRunning: 1,
    maxWaiting: opts.maxWaiting ?? 4,
    ...(opts.lodMaxWaiting !== undefined && { lodMaxWaiting: opts.lodMaxWaiting }),
  });
}

const N = 129;
/** The 2 km tile that has the crater observer's floor in its corner. */
const AT_POLE: TileKey = tileContaining('polar-south', 0, CRATER.lat, CRATER.lonEast);
const heightsOf = (a: LodAnswer): Float32Array => decodeQuantised(a.heights, a.quantumM, a.baseUnits);
const decoded = new WeakMap<LodAnswer, Float32Array>();
const at = (a: LodAnswer, r: number, c: number): number => {
  if (!decoded.has(a)) decoded.set(a, heightsOf(a));
  return (decoded.get(a) as Float32Array)[r * N + c] as number;
};

describe('tiersForLevel: the tiers a level reads', () => {
  it('reads the finest tier a level can use first, the finer ones last', () => {
    const ids = (level: number) => tiersForLevel(level, [SOUTH, GLOBE]).map((t) => t.id);
    expect(ids(0)).toEqual(['south-20m', 'globe-coarse']);
    // 250 m spacing wants data no finer than 62.5 m: the 20 m grid only fills in.
    expect(ids(2)).toEqual(['globe-coarse', 'south-20m']);
  });

  it('puts the coarsest of the too-fine tiers first when none is fine enough', () => {
    const mid = { ...SOUTH, id: 'south-40m', resolutionM: 40 };
    expect(tiersForLevel(3, [SOUTH, mid]).map((t) => t.id)).toEqual(['south-40m', 'south-20m']);
  });
});

describe('lodTileIn', () => {
  it('reads the crater: the floor at the pole corner, the 500 m wall at the far corner', async () => {
    const service = await open();
    const answer = await lodTileIn(service, AT_POLE);
    expect(answer).toMatchObject({
      scheme: 'polar-south', level: 0, n: N, quantumM: 0.1, noData: 65_535, resolutionM: 20, coverage: 1,
    });
    expect(answer.georef).toEqual(tileGeoref(AT_POLE));
    expect(heightsOf(answer)).toHaveLength(N * N);
    expect(at(answer, N - 1, 0)).toBeCloseTo(0, 1);
    expect(at(answer, 0, N - 1)).toBeCloseTo(500, 1);
    expect(answer.tiers).toEqual([{ id: 'south-20m', resolutionM: 20, share: 1 }]);
    expect(answer.minM).toBeCloseTo(0, 1);
    expect(answer.maxM).toBeCloseTo(500, 1);
    await service.close();
  });

  it('gives neighbouring tiles the same heights on the edge they share', async () => {
    const service = await open();
    const west = await lodTileIn(service, { scheme: 'polar-south', level: 0, x: 0, y: 0 });
    const east = await lodTileIn(service, { scheme: 'polar-south', level: 0, x: 1, y: 0 });
    for (let r = 0; r < N; r++) expect(at(west, r, N - 1)).toBe(at(east, r, 0));
    await service.close();
  });

  it('gives a tile its parent level heights at every 4th sample, where both levels read the same tiers', async () => {
    // Levels 0 and 1 both read the 20 m grid first: the shared nodes are equal.
    const service = await open();
    const parent = await lodTileIn(service, { scheme: 'polar-south', level: 1, x: 0, y: 0 });
    const child = await lodTileIn(service, { scheme: 'polar-south', level: 0, x: 0, y: 1 });
    // The child is the second row up (y 1 of 4), first column: rows 64 to 96.
    for (let r = 0; r < N; r += 4) {
      for (let c = 0; c < N; c += 4) expect(at(child, r, c)).toBe(at(parent, 32 * (3 - 1) + r / 4, c / 4));
    }
    await service.close();
  });

  it('gives shared nodes across levels the same height only where both levels read the same tier, up to the steps', async () => {
    const service = await open();
    const parent = await lodTileIn(service, { scheme: 'polar-south', level: 2, x: 0, y: 0 });
    const child = await lodTileIn(service, { scheme: 'polar-south', level: 1, x: 0, y: 0 });
    // Level 1 reads the 20 m grid first, level 2 the coarse globe first (tiersForLevel).
    const georef = child.georef as { minX: number; maxY: number; spacingM: number };
    // How far from the pole a node is, along its larger plane axis, metres.
    const reach = (r: number, c: number): number =>
      Math.max(georef.minX + c * georef.spacingM, georef.maxY - r * georef.spacingM);
    // The 20 m fixture covers about 6 km either side of the pole.
    const covered = (r: number, c: number): boolean => reach(r, c) < 5_900;
    const outside = (r: number, c: number): boolean => reach(r, c) > 6_100;
    // The same measured height, up to the two levels' steps (0.1 and 0.2 m).
    const within = (child.quantumM + parent.quantumM) / 2 + 1e-4;
    let [differing, equalOutside, checked] = [0, 0, 0];
    for (let r = 0; r < N; r += 4) {
      for (let c = 0; c < N; c += 4) {
        const gap = Math.abs(at(child, r, c) - at(parent, 96 + r / 4, c / 4));
        if (covered(r, c) && gap > 100) differing++;
        if (outside(r, c)) {
          checked++;
          if (gap <= within) equalOutside++;
        }
      }
    }
    // Across a change of the tier order the contract is «approximately equal»: the crater
    // wall is 500 m in the 20 m grid and a few metres in the globe, 475 m apart at a node.
    expect(differing).toBeGreaterThan(100);
    expect(checked).toBeGreaterThan(0);
    // Where only one tier covers, both levels read it: the same height.
    expect(equalOutside).toBe(checked);
    await service.close();
  });

  it('gives every tile of a level the level\'s step, so neighbours decode alike whatever their relief', async () => {
    const service = await open();
    const steps: number[] = [];
    for (const level of [0, 1, 2, 3]) {
      const flat = await lodTileIn(service, { scheme: 'polar-south', level, x: 3, y: 3 });
      const crater = await lodTileIn(service, { scheme: 'polar-south', level, x: 0, y: 0 });
      expect(flat.quantumM).toBe(crater.quantumM);
      steps.push(crater.quantumM);
    }
    expect(steps).toEqual([0.1, 0.1, 0.2, 0.4]);
    await service.close();
  });

  it('reads the coarse tier at a coarse level and fills the pole from the fine one', async () => {
    const service = await open();
    const answer = await lodTileIn(service, { scheme: 'polar-south', level: 2, x: 0, y: 0 });
    expect(answer.tiers.map((t) => t.id)).toEqual(['south-20m', 'globe-coarse']);
    expect(answer.coverage).toBe(1);
    const globe = answer.tiers.find((t) => t.id === 'globe-coarse');
    expect(globe?.share).toBeGreaterThan(0.9);
    await service.close();
  });

  it('answers a lat-lon tile from the globe, across the 0° E seam too', async () => {
    const service = await open();
    const key = tileContaining('latlon', 1, 20, 0.001);
    const answer = await lodTileIn(service, key);
    expect(answer).toMatchObject({ scheme: 'latlon', coverage: 1, resolutionM: 10_000 });
    const east = await lodTileIn(service, { ...key, x: 1_439 });
    expect(east.georef).toMatchObject({ kind: 'latlon' });
    await service.close();
  });

  it('refuses a tile no tier present covers', async () => {
    const southOnly = { ...CATALOGUE, tiers: [SOUTH], bands: [] };
    const service = await open({ catalogue: southOnly });
    const equator: TileKey = { scheme: 'latlon', level: 0, x: 0, y: 0 };
    await expect(lodTileIn(service, equator)).rejects.toThrow(TerrainUncoveredError);
    await service.close();
  });

  it('has a gate of its own: past its queue it is busy', async () => {
    const service = await open({ lodMaxWaiting: 0 });
    const first = lodTileIn(service, AT_POLE);
    await expect(lodTileIn(service, AT_POLE)).rejects.toThrow(TerrainBusyError);
    await first;
    await service.close();
  });

  it('is small: about 33 kB of heights, under 50 kB with its fields, less over the wire', async () => {
    const service = await open();
    const body = JSON.stringify(await lodTileIn(service, AT_POLE));
    expect(Buffer.byteLength(body)).toBeGreaterThan(N * N * 2);
    expect(Buffer.byteLength(body)).toBeLessThan(50_000);
    expect(gzipSync(body).length).toBeLessThan(Buffer.byteLength(body));
    await service.close();
  });
});

describe('cachedLod', () => {
  it('computes a tile once and then reads it from disk', async () => {
    const service = await open();
    const cache = await mkdtemp(join(tmpdir(), 'lod-cache-'));
    let misses = 0;
    const a = await cachedLod(service, cache, 2 ** 22).tile(AT_POLE, () => misses++);
    const b = await cachedLod(service, cache, 2 ** 22).tile(AT_POLE, () => misses++);
    expect(b).toEqual(a);
    expect(misses).toBe(1);
    await service.close();
    await rm(cache, { recursive: true, force: true });
  });

  it('names the tiers present in a token that changes with them', () => {
    expect(lodVersion([SOUTH, GLOBE])).toMatch(/^[0-9a-f]{8}$/);
    expect(lodVersion([SOUTH, GLOBE])).toBe(lodVersion([SOUTH, GLOBE]));
    expect(lodVersion([SOUTH])).not.toBe(lodVersion([SOUTH, GLOBE]));
  });

  it('keys by scheme, level, place and the tiers', () => {
    const base = lodKey(AT_POLE, 'abcd1234');
    expect(lodKey({ ...AT_POLE, x: AT_POLE.x + 1 }, 'abcd1234')).not.toBe(base);
    expect(lodKey({ ...AT_POLE, level: 1 }, 'abcd1234')).not.toBe(base);
    expect(lodKey({ ...AT_POLE, scheme: 'polar-north' }, 'abcd1234')).not.toBe(base);
    expect(lodKey(AT_POLE, 'abcd1235')).not.toBe(base);
    expect(lodKey({ ...AT_POLE, y: -3 }, 'abcd1234')).toMatch(/^[\w.+-]+$/);
  });

  it('says the terrain is not installed when no tier is on disk', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'lod-empty-'));
    const service = await open({ dir: empty });
    const source = cachedLod(service, join(empty, 'cache'), 2 ** 20);
    expect(() => source.version()).toThrow(TerrainNotInstalledError);
    await expect(source.tile(AT_POLE)).rejects.toThrow(TerrainNotInstalledError);
    await service.close();
    await rm(empty, { recursive: true, force: true });
  });
});

describe('parameters', () => {
  it('reads a tile key of whole numbers inside the grid', () => {
    expect(parseTileKey({ scheme: 'polar-south', level: '0', x: '-3', y: '12' })).toEqual({
      scheme: 'polar-south', level: 0, x: -3, y: 12,
    });
    expect(parseTileKey({ scheme: 'latlon', level: '3', x: '89', y: '0' }).scheme).toBe('latlon');
  });

  it('refuses a key off the grid or not a whole number', () => {
    const base = { scheme: 'polar-south', level: '0', x: '0', y: '0' };
    for (const bad of [
      { scheme: 'moon' }, { scheme: undefined }, { level: '4' }, { level: '-1' }, { level: '0.5' },
      { x: '1.5' }, { x: 'abc' }, { x: '' }, { x: '1e3' }, { x: '900000' }, { y: ' 1' },
    ]) {
      expect(() => parseTileKey({ ...base, ...bad })).toThrow(/scheme|level|tile|"x"|"y"/);
    }
  });

  it('reads the ring request: the point on the 0.01° grid, 3 levels unless told', () => {
    expect(parseIndexParams({ lat: '-85.504', lon: '31.006' })).toEqual({ lat: -85.5, lonEast: 31.01, levels: 3, format: 'json' });
    expect(parseIndexParams({ lat: '0', lon: '0', levels: '4' }).levels).toBe(4);
    for (const levels of ['0', '5', 'x', '', '1.5']) {
      expect(() => parseIndexParams({ lat: '0', lon: '0', levels })).toThrow(/levels/);
    }
    expect(() => parseIndexParams({ lat: '95', lon: '0' })).toThrow(/lat/);
  });
});

describe('GET /api/v1/terrain/tiles', () => {
  const NOW = Date.UTC(2026, 10, 14);
  const VERSION = 'abcd1234';
  let computed = 0;
  const answerFor = (key: TileKey, version = VERSION): LodAnswer => ({
    version, scheme: key.scheme, level: key.level, x: key.x, y: key.y, n: N, georef: tileGeoref(key),
    quantumM: 0.1, baseUnits: 0, noData: 65_535, heights: '', minM: 0, maxM: 0,
    resolutionM: 59, tiers: [], coverage: 1,
  });
  const fake: LodSource = {
    version: () => VERSION,
    async tile(key, onMiss) {
      onMiss?.();
      computed++;
      return answerFor(key);
    },
  };
  const failing = (error: Error): LodSource => ({ version: () => VERSION, tile: () => Promise.reject(error) });

  function api(lod: LodSource | undefined, options: { limit?: number; lines?: string[] } = {}) {
    const horizons = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: tmpdir() });
    const missLimiter = createMissLimiter({ limit: 30, now: () => NOW });
    const lodLimiter = createMissLimiter({ limit: options.limit ?? 600, now: () => NOW });
    const log = (line: string) => options.lines?.push(line);
    return createApp({ horizons, pointsCache: horizons.points, sites: [], now: () => NOW, missLimiter, lodLimiter, lod, log });
  }
  const TILE = '/api/v1/terrain/tiles/polar-south/0/3/-2';

  describe('the ring', () => {
    const RING = '/api/v1/terrain/tiles?lat=-85.504&lon=31.006';

    it('lists the tiles of three levels around the point, nearest first, with their urls', async () => {
      const res = await api(fake).request(RING);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('public, max-age=300');
      const body = (await res.json()) as {
        lat: number; lonEast: number; scheme: string; version: string; n: number;
        levels: { level: number; sizeM: number; spacingM: number; tiles: { x: number; y: number; url: string }[] }[];
      };
      expect(body).toMatchObject({ lat: -85.5, lonEast: 31.01, scheme: 'polar-south', version: VERSION, n: N });
      expect(body.levels.map((l) => [l.level, l.sizeM, l.spacingM])).toEqual([
        [0, 2_000, 15.625], [1, 8_000, 62.5], [2, 32_000, 250],
      ]);
      const first = body.levels[0]?.tiles[0];
      const under = tileContaining('polar-south', 0, -85.5, 31.01);
      expect(first).toMatchObject({ x: under.x, y: under.y });
      expect(first?.url).toBe(`/api/v1/terrain/tiles/polar-south/0/${under.x}/${under.y}?v=${VERSION}`);
    });

    it('takes a fourth level on request', async () => {
      const res = await api(fake).request(`${RING}&levels=4`);
      expect(((await res.json()) as { levels: unknown[] }).levels).toHaveLength(4);
    });

    it('refuses a bad point or level with 400', async () => {
      for (const q of ['lat=-91&lon=0', 'lat=0', 'lat=0&lon=0&levels=0', 'lat=0&lon=0&levels=5']) {
        expect((await api(fake).request(`/api/v1/terrain/tiles?${q}`)).status).toBe(400);
      }
    });

    it('answers 503 «terrain data is not installed» without terrain, or with no tier on disk', async () => {
      const none = await api(undefined).request(RING);
      expect(none.status).toBe(503);
      expect(await none.json()).toEqual({ error: 'terrain data is not installed' });
      const bare: LodSource = { version() { throw new TerrainNotInstalledError(); }, tile: fake.tile };
      expect((await api(bare).request(RING)).status).toBe(503);
    });
  });

  describe('one tile', () => {
    it('answers the tile, a year immutable under the current version', async () => {
      const res = await api(fake).request(`${TILE}?v=${VERSION}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('etag')).toBe(`"${VERSION}"`);
      expect(await res.json()).toMatchObject({ scheme: 'polar-south', level: 0, x: 3, y: -2, n: N, version: VERSION });
    });

    it('keeps a day, not for ever, when it is asked without a version, and 5 minutes under an old one', async () => {
      const bare = await api(fake).request(TILE);
      expect(bare.headers.get('cache-control')).toBe('public, max-age=86400');
      const old = await api(fake).request(`${TILE}?v=00000000`);
      expect(old.status).toBe(200);
      expect(old.headers.get('cache-control')).toBe('public, max-age=300');
      expect(old.headers.get('etag')).toBe(`"${VERSION}"`);
    });

    it('answers 304 to a matching ETag without computing the tile', async () => {
      const before = computed;
      const res = await api(fake).request(TILE, { headers: { 'If-None-Match': `"${VERSION}"` } });
      expect(res.status).toBe(304);
      expect(res.headers.get('etag')).toBe(`"${VERSION}"`);
      expect(computed).toBe(before);
      const other = await api(fake).request(TILE, { headers: { 'If-None-Match': '"00000000"' } });
      expect(other.status).toBe(200);
    });

    it('refuses a bad key or version with 400', async () => {
      const bad = [
        '/moon/0/0/0', '/polar-south/9/0/0', '/polar-south/0/x/0', '/polar-south/0/1.5/0',
        '/polar-south/0/900000/0', '/latlon/3/90/0', '/polar-south/0/0/0?v=nope',
      ];
      for (const path of bad) {
        expect((await api(fake).request(`/api/v1/terrain/tiles${path}`)).status, path).toBe(400);
      }
    });

    it('answers 503 without terrain, 404 where no tier covers, 503 with Retry-After when busy', async () => {
      expect((await api(undefined).request(TILE)).status).toBe(503);
      const lines: string[] = [];
      const none = await api(failing(new TerrainUncoveredError('x')), { lines }).request(TILE);
      expect(none.status).toBe(404);
      expect(lines).toEqual([`api error: GET /api/v1/terrain/tiles/polar-south/0/{x}/{y} 404 0 ms`]);
      const busy = await api(failing(new TerrainBusyError())).request(TILE);
      expect(busy.status).toBe(503);
      // VENT-78: a tile's queue drains fast, so it asks for 2 s, not the horizon's 10.
      expect(busy.headers.get('retry-after')).toBe(String(TILE_BUSY_RETRY_SEC));
      expect(TILE_BUSY_RETRY_SEC).toBe(2);
      const bare = await api(failing(new TerrainNotInstalledError())).request(TILE);
      expect(await bare.json()).toEqual({ error: 'terrain data is not installed' });
    });

    it('counts computations on its own limit: a ring of tiles is not 30 new points', async () => {
      const limited = api(fake, { limit: 2 });
      expect((await limited.request('/api/v1/terrain/tiles/polar-south/0/0/0')).status).toBe(200);
      expect((await limited.request('/api/v1/terrain/tiles/polar-south/0/1/0')).status).toBe(200);
      const third = await limited.request('/api/v1/terrain/tiles/polar-south/0/2/0');
      expect(third.status).toBe(429);
      expect(third.headers.get('retry-after')).not.toBeNull();
      const wide = api(fake);
      for (let x = 0; x < 40; x++) {
        expect((await wide.request(`/api/v1/terrain/tiles/polar-south/0/${x}/0`)).status).toBe(200);
      }
    });

    it('serves a real tile end to end through the disk cache', async () => {
      const service = await open();
      const cache = await mkdtemp(join(tmpdir(), 'lod-api-'));
      const source = cachedLod(service, cache, 2 ** 22);
      const res = await api(source).request(
        `/api/v1/terrain/tiles/${AT_POLE.scheme}/0/${AT_POLE.x}/${AT_POLE.y}?v=${source.version()}`,
      );
      const body = (await res.json()) as LodAnswer;
      expect(res.status).toBe(200);
      expect(decodeQuantised(body.heights, body.quantumM, body.baseUnits)).toHaveLength(N * N);
      expect(body.resolutionM).toBe(20);
      await service.close();
      await rm(cache, { recursive: true, force: true });
    });
  });
});
