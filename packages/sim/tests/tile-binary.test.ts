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
 * The binary form of a levelled tile (VENT-98): a fixed header and the
 * 16-bit heights as residuals of a 2D gradient predictor, zigzagged and split
 * into byte planes. Exact both ways, on the recorded LOLA tiles of IM-2 and
 * Oceanus and on synthetic edge cases, and clearly smaller than the JSON
 * once both are gzipped.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  TILE_BINARY_HEADER_BYTES,
  decodeTileBinary,
  encodeTileBinary,
  type BinaryTile,
} from '../src/tile-binary.ts';
import { predictResiduals, restoreHeights } from '../src/tile-predict.ts';
import { NO_DATA, decodeQuantised } from '../src/tile-quant.ts';
import { fromBase64 } from '../src/terrain-codec.ts';
import { TILE_SAMPLES, type TileKey } from '../src/tile-scheme.ts';

const N = TILE_SAMPLES;
const FIXTURES = new URL('../../../tests/e2e/fixtures/', import.meta.url);
const RECORDED = ['terrain-ring-im2', 'terrain-ring-oceanus'];

interface Recorded {
  readonly version: string;
  readonly scheme: TileKey['scheme'];
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly n: number;
  readonly quantumM: number;
  readonly baseUnits: number;
  readonly heights: string;
  readonly resolutionM: number;
  readonly minM: number;
  readonly maxM: number;
  readonly coverage: number;
}

/** Every recorded tile answer, with its JSON text. */
function recordedTiles(): { text: string; json: Recorded }[] {
  return RECORDED.flatMap((dir) => {
    const at = new URL(`${dir}/`, FIXTURES);
    return readdirSync(at).filter((f) => f.startsWith('tile-')).map((f) => {
      const text = readFileSync(new URL(f, at), 'utf8');
      return { text, json: JSON.parse(text) as Recorded };
    });
  });
}

/** The 16-bit values of a recorded answer. */
function qOf(json: Recorded): Uint16Array {
  const bytes = fromBase64(json.heights);
  const view = new DataView(bytes.buffer);
  return Uint16Array.from({ length: bytes.length / 2 }, (_, i) => view.getUint16(i * 2, true));
}

function binaryOf(json: Recorded): BinaryTile {
  const { version, scheme, level, x, y, n, quantumM, baseUnits, resolutionM, minM, maxM, coverage } = json;
  return { version, key: { scheme, level, x, y }, n, quantumM, baseUnits, q: qOf(json), resolutionM, minM, maxM, coverage };
}

function synthetic(q: Uint16Array, overrides: Partial<BinaryTile> = {}): BinaryTile {
  return {
    version: '0a1b2c3d', key: { scheme: 'polar-south', level: 0, x: 3, y: -2 }, n: N,
    quantumM: 0.1, baseUnits: -34_210, q, resolutionM: 20, minM: -3421, maxM: -2987.5, coverage: 1,
    ...overrides,
  };
}

/** The bytes of a typed array, so two large ones compare in one step. */
const bytesOf = (a: ArrayBufferView): Buffer => Buffer.from(a.buffer, a.byteOffset, a.byteLength);

/** `back` equals `tile`: the fields, and the values byte for byte. */
function expectSame(back: BinaryTile, tile: BinaryTile, name = ''): void {
  const { q, ...fields } = tile;
  const { q: backQ, ...backFields } = back;
  expect(backFields, name).toEqual(fields);
  expect(bytesOf(backQ).equals(bytesOf(q)), name).toBe(true);
}

const fill = (f: (row: number, col: number) => number): Uint16Array =>
  Uint16Array.from({ length: N * N }, (_, i) => f(Math.floor(i / N), i % N));

describe('the 2D predictor', () => {
  it('turns a plane into residuals that are all zero past the first row and column', () => {
    const q = fill((r, c) => 1000 + 3 * r + 5 * c);
    const residuals = predictResiduals(q, N);
    for (let r = 1; r < N; r++) for (let c = 1; c < N; c++) expect(residuals[r * N + c]).toBe(0);
    expect(bytesOf(restoreHeights(residuals, N)).equals(bytesOf(q))).toBe(true);
  });

  it('restores any 16-bit values exactly, wrapping past the ends of the range', () => {
    let seed = 7;
    const noise = fill(() => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed % 65_536;
    });
    expect(bytesOf(restoreHeights(predictResiduals(noise, N), N)).equals(bytesOf(noise))).toBe(true);
  });
});

describe('encodeTileBinary / decodeTileBinary', () => {
  it('reads back every recorded LOLA tile exactly, header and heights', () => {
    const tiles = recordedTiles();
    expect(tiles.length).toBeGreaterThanOrEqual(78);
    for (const { json } of tiles) {
      const tile = binaryOf(json);
      const back = decodeTileBinary(encodeTileBinary(tile));
      expectSame(back, tile);
      const metres = Float32Array.from(back.q, (v) => (v === NO_DATA ? Number.NaN : (back.baseUnits + v) * back.quantumM));
      expect(bytesOf(metres).equals(bytesOf(decodeQuantised(json.heights, json.quantumM, json.baseUnits)))).toBe(true);
    }
  });

  it('reads back the edge cases: flat, a cliff, the ends of the range, nodes without data', () => {
    const cases = {
      flat: fill(() => 500),
      cliff: fill((_r, c) => (c < 64 ? 0 : 65_534)),
      extremes: fill((r, c) => ((r + c) % 2 === 0 ? 0 : 65_534)),
      holes: fill((r, c) => (r > 100 || c === 7 ? NO_DATA : 2000 + r)),
      empty: fill(() => NO_DATA),
    };
    for (const [name, q] of Object.entries(cases)) {
      expectSame(decodeTileBinary(encodeTileBinary(synthetic(q))), synthetic(q), name);
    }
  });

  it('keeps every scheme, negative places, the coarse steps and a small tile', () => {
    const keys: TileKey[] = [
      { scheme: 'polar-north', level: 3, x: -1, y: -1 },
      { scheme: 'latlon', level: 2, x: 359, y: -15 },
    ];
    for (const key of keys) {
      const tile = synthetic(fill((r) => r), { key, quantumM: 0.4, baseUnits: 2_147_000_000, coverage: 0.4321 });
      expectSame(decodeTileBinary(encodeTileBinary(tile)), tile);
    }
    const small = synthetic(Uint16Array.from([1, 2, 3, 4]), { n: 2 });
    expectSame(decodeTileBinary(encodeTileBinary(small)), small);
  });

  it('is the header and two bytes a node, little-endian, starting with its magic', () => {
    const bytes = encodeTileBinary(synthetic(fill(() => 1)));
    expect(bytes.length).toBe(TILE_BINARY_HEADER_BYTES + 2 * N * N);
    expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('VLTB');
    expect(new DataView(bytes.buffer, bytes.byteOffset).getInt32(8, true)).toBe(3);
  });

  it('refuses what is not a tile: short, a wrong magic or format, a cut payload, a key off the grid', () => {
    const good = encodeTileBinary(synthetic(fill(() => 1)));
    const broken = (at: number, value: number) => {
      const copy = good.slice();
      copy[at] = value;
      return copy;
    };
    const bad = [
      new Uint8Array(0), good.subarray(0, 20), broken(0, 0), broken(4, 9), broken(5, 7), broken(7, 0),
      good.subarray(0, good.length - 1), new Uint8Array([...good, 0]), broken(6, 9),
    ];
    for (const bytes of bad) expect(() => decodeTileBinary(bytes)).toThrow(RangeError);
    expect(() => encodeTileBinary(synthetic(fill(() => 1), { version: 'stub0001' }))).toThrow(RangeError);
  });
});

describe('the size of a tile over the wire', () => {
  it('gzips to well under the JSON gzipped, level by level, on the recorded tiles', () => {
    const sums = new Map<number, { json: number; bin: number }>();
    for (const { text, json } of recordedTiles()) {
      const sum = sums.get(json.level) ?? { json: 0, bin: 0 };
      sum.json += gzipSync(text).length;
      sum.bin += gzipSync(encodeTileBinary(binaryOf(json))).length;
      sums.set(json.level, sum);
    }
    // Measured on 2026-11-06 (gzip level 6, IM-2 and Oceanus together): 0.26, 0.39, 0.49 and 0.60 of the JSON at levels 0 to 3.
    const bounds = [0.45, 0.5, 0.6, 0.7];
    for (const [level, { json, bin }] of sums) expect(bin / json, `level ${level}`).toBeLessThan(bounds[level] ?? 0);
  });
});
