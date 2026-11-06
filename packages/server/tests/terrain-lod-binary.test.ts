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
 * The levelled tile in binary (VENT-98): the ring lists binary urls only to a
 * client that asks with `format=bin`, the tile route answers them as
 * `application/octet-stream` gzipped, with the JSON answer's ETag, 304 and
 * cache rules, and the JSON route stays as it was.
 */
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import {
  NO_DATA,
  decodeQuantised,
  decodeTileBinary,
  dequantiseHeights,
  encodeQuantised,
  quantiseHeights,
  tileGeoref,
  type TileKey,
} from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { createMissLimiter } from '../src/miss-limiter.ts';
import type { LodAnswer } from '../src/terrain/lod-answer.ts';
import { lodBinary } from '../src/terrain/lod-binary.ts';
import type { LodSource } from '../src/terrain/lod-cache.ts';

const NOW = Date.UTC(2026, 10, 14);
const VERSION = 'abcd1234';
const N = 129;
const TILE = '/api/v1/terrain/tiles/polar-south/0/3/-2';
const RING = '/api/v1/terrain/tiles?lat=-85.504&lon=31.006';

/** A rough tile: a swell, a ripple and a hole without data. */
function answerFor(key: TileKey): LodAnswer {
  const heights = Float32Array.from({ length: N * N }, (_, i) =>
    i === 77 ? Number.NaN : -3000 + 400 * Math.sin(i / 900) + 25 * Math.sin(i / 7));
  const q = quantiseHeights(heights, 0.1);
  return {
    version: VERSION, ...key, n: N, georef: tileGeoref(key),
    quantumM: q.quantumM, baseUnits: q.baseUnits, noData: NO_DATA, heights: encodeQuantised(q),
    minM: -3424.99, maxM: -2575.01, resolutionM: 20,
    tiers: [{ id: 'polar-south-20m', resolutionM: 20, share: 1 }], coverage: 0.9999,
  };
}

let computed = 0;
const fake: LodSource = {
  version: () => VERSION,
  async tile(key, onMiss) {
    onMiss?.();
    computed++;
    return answerFor(key);
  },
};

function api(lod: LodSource = fake) {
  const horizons = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: tmpdir() });
  const missLimiter = createMissLimiter({ limit: 30, now: () => NOW });
  const lodLimiter = createMissLimiter({ limit: 600, now: () => NOW });
  return createApp({ horizons, pointsCache: horizons.points, sites: [], now: () => NOW, missLimiter, lodLimiter, lod, log: () => undefined });
}

const urlsOf = async (res: Response): Promise<string[]> =>
  ((await res.json()) as { levels: { tiles: { url: string }[] }[] }).levels.flatMap((l) => l.tiles.map((t) => t.url));

describe('the ring, by format', () => {
  it('lists binary urls only when asked with format=bin', async () => {
    const bin = await urlsOf(await api().request(`${RING}&format=bin`));
    expect(bin.length).toBeGreaterThan(0);
    for (const url of bin) expect(url).toMatch(new RegExp(`\\?v=${VERSION}&format=bin$`));
    const plain = await urlsOf(await api().request(RING));
    expect(plain).toEqual(bin.map((url) => url.replace('&format=bin', '')));
  });

  it('lists JSON urls for a format it does not know, as a server without binary tiles does', async () => {
    const other = await urlsOf(await api().request(`${RING}&format=msgpack`));
    expect(other).toEqual(await urlsOf(await api().request(RING)));
  });
});

describe('one tile in binary', () => {
  it('answers the same heights as the JSON, as application/octet-stream', async () => {
    const res = await api().request(`${TILE}?v=${VERSION}&format=bin`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('etag')).toBe(`"${VERSION}"`);
    const tile = decodeTileBinary(new Uint8Array(await res.arrayBuffer()));
    const json = answerFor({ scheme: 'polar-south', level: 0, x: 3, y: -2 });
    expect(tile).toMatchObject({ version: VERSION, key: { scheme: 'polar-south', level: 0, x: 3, y: -2 }, n: N,
      quantumM: json.quantumM, baseUnits: json.baseUnits, resolutionM: 20, minM: json.minM, maxM: json.maxM, coverage: 0.9999 });
    const metres = dequantiseHeights(tile);
    const expected = decodeQuantised(json.heights, json.quantumM, json.baseUnits);
    expect(Buffer.from(metres.buffer).equals(Buffer.from(expected.buffer))).toBe(true);
  });

  it('is gzipped for a client that accepts it, to under half of the JSON gzipped', async () => {
    const headers = { 'Accept-Encoding': 'gzip' };
    const bin = await api().request(`${TILE}?v=${VERSION}&format=bin`, { headers });
    const json = await api().request(`${TILE}?v=${VERSION}`, { headers });
    expect(bin.headers.get('content-encoding')).toBe('gzip');
    expect(bin.headers.get('etag')).toBe(`W/"${VERSION}"`);
    const [binBytes, jsonBytes] = [Buffer.from(await bin.arrayBuffer()), Buffer.from(await json.arrayBuffer())];
    expect(decodeTileBinary(new Uint8Array(gunzipSync(binBytes))).n).toBe(N);
    expect(binBytes.length).toBeLessThan(jsonBytes.length / 2);
  });

  it('keeps the JSON route as it was: no format, JSON', async () => {
    const res = await api().request(`${TILE}?v=${VERSION}`);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await res.json()).toMatchObject({ scheme: 'polar-south', level: 0, x: 3, y: -2, n: N, version: VERSION });
  });

  it('answers 304 to a matching ETag, gzipped or not, without computing the tile', async () => {
    const before = computed;
    for (const tag of [`"${VERSION}"`, `W/"${VERSION}"`]) {
      const res = await api().request(`${TILE}?v=${VERSION}&format=bin`, { headers: { 'If-None-Match': tag } });
      expect(res.status).toBe(304);
    }
    expect(computed).toBe(before);
  });

  it('refuses a format it does not serve with 400', async () => {
    for (const format of ['msgpack', '', 'BIN']) {
      expect((await api().request(`${TILE}?v=${VERSION}&format=${format}`)).status, format).toBe(400);
    }
  });

  it('encodes a stored answer on the way out in a few milliseconds at most (about 0.5 ms measured)', () => {
    const answer = answerFor({ scheme: 'polar-south', level: 0, x: 3, y: -2 });
    for (let i = 0; i < 5; i++) lodBinary(answer);
    const start = performance.now();
    for (let i = 0; i < 20; i++) lodBinary(answer);
    expect((performance.now() - start) / 20).toBeLessThan(10);
  });
});
