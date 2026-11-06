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
 * Binary terrain tiles in the client (VENT-98): the ring is asked with
 * `format=bin`, each tile is decoded by its answer's Content-Type (binary to
 * the codec of `@ventana/sim`, anything else as today's JSON), so the view
 * works with an API that has binary tiles and with one that has not. A body
 * that is not a tile is a failure that may pass, like bad JSON; a binary
 * tile of another key is a hole.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encodeTileBinary, type BinaryTile, type TileKey } from '@ventana/sim';
import { parseTile } from '../src/terrain/ring/ring-answer';
import { fetchRingSource, ringUrl } from '../src/terrain/ring/ring-fetch';
import { TILE_RETRY } from '../src/terrain/ring/ring-http';
import type { RingTile } from '../src/terrain/ring/ring-store';

const SITES = 'https://x.test/api/v1/sites';
const FILE = '../../../tests/e2e/fixtures/terrain-ring-im2/tile-polar-south-0-37-67.json';
const recorded = JSON.parse(readFileSync(new URL(FILE, import.meta.url), 'utf8')) as {
  version: string; level: number; x: number; y: number; n: number; quantumM: number; baseUnits: number;
  heights: string; resolutionM: number; minM: number; maxM: number; coverage: number;
};
const KEY: TileKey = { scheme: 'polar-south', level: 0, x: 37, y: 67 };
const URL_OF = (k: TileKey) => `/api/v1/terrain/tiles/${k.scheme}/${k.level}/${k.x}/${k.y}?v=${recorded.version}&format=bin`;
const ring = { scheme: 'polar-south', levels: [{ level: 0, tiles: [{ x: KEY.x, y: KEY.y, url: URL_OF(KEY) }] }] };
const BINARY = { 'content-type': 'application/octet-stream' };

function binaryOf(key: TileKey = KEY): Uint8Array<ArrayBuffer> {
  const bytes = Buffer.from(recorded.heights, 'base64');
  const q = Uint16Array.from({ length: bytes.length / 2 }, (_, i) => bytes.readUInt16LE(i * 2));
  const { version, n, quantumM, baseUnits, resolutionM, minM, maxM, coverage } = recorded;
  const tile: BinaryTile = { version, key, n, quantumM, baseUnits, q, resolutionM, minM, maxM, coverage };
  return encodeTileBinary(tile);
}

const waits = { sleep: () => Promise.resolve(), random: () => 0.5 };
const request = { point: { lat: -84.79, lonEast: 29.2 }, levels: 1, wanted: (_s: string, e: readonly { level: number; x: number; y: number; url: string }[]) => e };

async function load(answer: (url: string, n: number) => Response): Promise<{ tiles: RingTile[]; asked: Map<string, number> }> {
  const tiles: RingTile[] = [];
  const asked = new Map<string, number>();
  const fetcher = (async (url: string) => {
    const n = (asked.get(url) ?? 0) + 1;
    asked.set(url, n);
    return url.includes('/tiles/polar') ? answer(url, n) : new Response(JSON.stringify(ring));
  }) as unknown as typeof fetch;
  const feed = { scheme: () => undefined, tile: (t: RingTile) => tiles.push(t), settled: () => undefined };
  await fetchRingSource(fetcher, SITES, waits).load(request, feed, new AbortController().signal);
  return { tiles, asked };
}

const same = (a: Float32Array, b: Float32Array): boolean =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
const jsonTile = (): RingTile => parseTile(recorded, { ...KEY, url: '' }, 'polar-south') as RingTile;

describe('binary terrain tiles in the client', () => {
  it('asks the ring for binary tiles', () => {
    const url = new URL(ringUrl(SITES, { lat: -84.79, lonEast: 29.2 }, 4));
    expect(url.searchParams.get('format')).toBe('bin');
    expect(url.searchParams.get('levels')).toBe('4');
  });

  it('decodes an octet-stream answer to the same tile the JSON gives', async () => {
    const { tiles } = await load(() => new Response(binaryOf(), { headers: BINARY }));
    expect(tiles).toHaveLength(1);
    const [tile] = tiles as [RingTile];
    const json = jsonTile();
    expect({ key: tile.key, n: tile.n, resolutionM: tile.resolutionM }).toEqual({ key: json.key, n: json.n, resolutionM: json.resolutionM });
    expect(same(tile.heights, json.heights)).toBe(true);
  });

  it('reads a JSON answer as before, from an API without binary tiles', async () => {
    const { tiles } = await load(() => new Response(JSON.stringify(recorded), { headers: { 'content-type': 'application/json' } }));
    expect(tiles).toHaveLength(1);
    expect(same((tiles[0] as RingTile).heights, jsonTile().heights)).toBe(true);
  });

  it('reads a binary body that comes in many small pieces', async () => {
    const bytes = binaryOf();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (let at = 0; at < bytes.length; at += 997) c.enqueue(bytes.slice(at, at + 997));
        c.close();
      },
    });
    const { tiles } = await load(() => new Response(body, { headers: BINARY }));
    expect(same((tiles[0] as RingTile).heights, jsonTile().heights)).toBe(true);
  });

  it('asks again for a binary body that is not a tile, like bad JSON, and keeps a hole once the tries run out', async () => {
    const cut = binaryOf().slice(0, 5000);
    const once = await load((_url, n) => new Response(n === 1 ? cut : binaryOf(), { headers: BINARY }));
    expect(once.tiles).toHaveLength(1);
    expect([...once.asked.values()].at(-1)).toBe(2);
    const never = await load(() => new Response(cut, { headers: BINARY }));
    expect(never.tiles).toHaveLength(0);
    expect([...never.asked.values()].at(-1)).toBe(TILE_RETRY.delaysMs.length + 1);
  });

  it('keeps a hole for a binary tile of another key', async () => {
    const other = binaryOf({ ...KEY, x: KEY.x + 1 });
    const { tiles, asked } = await load(() => new Response(other, { headers: BINARY }));
    expect(tiles).toHaveLength(0);
    expect([...asked.values()].at(-1)).toBe(1);
  });
});
