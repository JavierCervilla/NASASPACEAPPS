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
 * Aligned height tiles with levels of detail (VENT-46): the heights at the
 * nodes of the global tiling, from the first grid that covers each node, and
 * their 16-bit form. Synthetic grids whose every pixel is noise, so an edge
 * that agrees agrees by construction and not by luck.
 */
import { describe, expect, it } from 'vitest';
import { demHeightAt, type DemGrid } from '../src/dem-grid.ts';
import { alignedTile, minDataResolutionM } from '../src/lod-tile.ts';
import {
  decodeQuantised,
  dequantiseHeights,
  encodeQuantised,
  quantiseHeights,
} from '../src/tile-quant.ts';
import { levelQuantumM } from '../src/level-quantum.ts';
import { sampleDirection, tileGeoref } from '../src/tile-georef.ts';
import { LUNAR_RADIUS_M, TILE_SAMPLES, type TileKey } from '../src/tile-scheme.ts';

const R = LUNAR_RADIUS_M;
const LAST = TILE_SAMPLES - 1;
const noise = (l: number, s: number): number => ((l * 73_856_093) ^ (s * 19_349_663)) % 2_000;

/** A south polar grid of 20 m pixels, 20 km across, noise for heights. */
const POLAR: DemGrid = {
  id: 'polar-20m', lines: 1_001, samples: 1_001, metresPerDn: 0.5, radiusM: R,
  projection: { kind: 'polar', pole: 'south', poleLine: 500, poleSample: 500, metresPerPixel: 20 },
  dnAt: noise,
};
/** A global grid of 8 pixels a degree, 360° wide. */
const PPD = 8;
const GLOBE: DemGrid = {
  id: 'globe', lines: 180 * PPD, samples: 360 * PPD, metresPerDn: 1, radiusM: R,
  projection: {
    kind: 'cylindrical', pixelsPerDeg: PPD, lineOffset: 90 * PPD - 0.5,
    sampleOffset: 180 * PPD - 0.5, centerLonDeg: 180,
  },
  dnAt: (l, s) => noise(l, s) / 2,
};

const south = (level: number, x: number, y: number): TileKey => ({ scheme: 'polar-south', level, x, y });
const latlon = (level: number, x: number, y: number): TileKey => ({ scheme: 'latlon', level, x, y });
const at = (t: { heights: Float32Array }, r: number, c: number): number => t.heights[r * TILE_SAMPLES + c] as number;

describe('alignedTile', () => {
  it('reads each sample at its own node, from the first grid that covers it', () => {
    const key = south(0, 1, 1);
    const tile = alignedTile([POLAR, GLOBE], key);
    const g = tileGeoref(key);
    expect(tile.n).toBe(TILE_SAMPLES);
    expect(tile.heights).toHaveLength(TILE_SAMPLES * TILE_SAMPLES);
    for (const [r, c] of [[0, 0], [17, 99], [LAST, LAST], [64, 3]] as const) {
      const want = demHeightAt(POLAR, sampleDirection(g, r, c));
      expect(at(tile, r, c)).toBe(Math.fround(want));
    }
    expect(tile.covered).toBe(TILE_SAMPLES * TILE_SAMPLES);
    expect(tile.stopsByGrid).toEqual({ 'polar-20m': TILE_SAMPLES * TILE_SAMPLES });
  });

  it('goes on to the next grid where the first has no height, and counts both', () => {
    // 5 km from the pole to 21 km: the 10 km edge of the polar grid is crossed.
    const tile = alignedTile([POLAR, GLOBE], south(2, 0, 0));
    expect(Object.keys(tile.stopsByGrid).sort()).toEqual(['globe', 'polar-20m']);
    expect(tile.covered).toBe(TILE_SAMPLES * TILE_SAMPLES);
  });

  it('leaves NaN where no grid covers and says how many samples were covered', () => {
    const tile = alignedTile([POLAR], south(2, 0, 0));
    expect(tile.covered).toBeGreaterThan(0);
    expect(tile.covered).toBeLessThan(TILE_SAMPLES * TILE_SAMPLES);
    expect(Number.isNaN(at(tile, 0, LAST))).toBe(true);
    expect(Number.isNaN(at(tile, LAST, 0))).toBe(false);
  });

  it('refuses a tile no grid covers at all', () => {
    expect(() => alignedTile([POLAR], south(0, 20, 20))).toThrow(RangeError);
    expect(() => alignedTile([], south(0, 0, 0))).toThrow(RangeError);
  });

  it.each([
    [south(0, 3, 2), south(0, 4, 2)],
    [latlon(0, -1 + 5_760, 5), latlon(0, 0, 5)],
    [latlon(1, 100, -10), latlon(1, 101, -10)],
  ])('has equal heights on the edge two neighbours share (%j, %j)', (west, east) => {
    const a = alignedTile([GLOBE, POLAR], west);
    const b = alignedTile([GLOBE, POLAR], east);
    for (let r = 0; r < TILE_SAMPLES; r++) expect(at(a, r, LAST)).toBe(at(b, r, 0));
  });

  it.each([
    [south(0, 5, 5), south(0, 5, 6)],
    [latlon(0, 300, 20), latlon(0, 300, 21)],
  ])('has equal heights on the edge a tile shares with the one north of it (%j, %j)', (low, high) => {
    const a = alignedTile([GLOBE, POLAR], low);
    const b = alignedTile([GLOBE, POLAR], high);
    for (let c = 0; c < TILE_SAMPLES; c++) expect(at(a, 0, c)).toBe(at(b, LAST, c));
  });

  it.each([
    ['polar-south' as const, 1, -1],
    ['latlon' as const, 100, -7],
  ])('has the heights of its parent at every 4th sample of each child (%s)', (scheme, x, y) => {
    const parentKey: TileKey = { scheme, level: 1, x, y };
    const parent = alignedTile([GLOBE, POLAR], parentKey);
    const child: TileKey = { scheme, level: 0, x: 4 * x + 2, y: 4 * y + 1 };
    const kid = alignedTile([GLOBE, POLAR], child);
    for (let r = 0; r < TILE_SAMPLES; r += 4) {
      for (let c = 0; c < TILE_SAMPLES; c += 4) {
        expect(at(kid, r, c)).toBe(at(parent, 32 * (3 - 1) + r / 4, 32 * 2 + c / 4));
      }
    }
  });

  it('is the same on every call: no hidden state between tiles', () => {
    const a = alignedTile([GLOBE], latlon(2, 10, 3));
    alignedTile([GLOBE], latlon(2, 11, 3));
    const b = alignedTile([GLOBE], latlon(2, 10, 3));
    expect(b.heights).toEqual(a.heights);
  });

  it('reports the lowest and highest height', () => {
    const tile = alignedTile([GLOBE], latlon(0, 100, 5));
    const finite = [...tile.heights].filter(Number.isFinite);
    expect(tile.minM).toBe(Math.min(...finite));
    expect(tile.maxM).toBe(Math.max(...finite));
  });
});

describe('minDataResolutionM', () => {
  it('is a quarter of the level spacing, so a level never reads data far finer than it draws', () => {
    expect([0, 1, 2, 3].map(minDataResolutionM)).toEqual([3.90625, 15.625, 62.5, 250]);
  });
});

describe('quantiseHeights', () => {
  const sample = (n: number, f: (i: number) => number): Float32Array => Float32Array.from({ length: n }, (_, i) => f(i));

  it('keeps every height within 0.05 m while the tile spans under 6.5 km', () => {
    const heights = sample(TILE_SAMPLES * TILE_SAMPLES, (i) => -3_210.37 + ((i * 7.31) % 4_000));
    const q = quantiseHeights(heights);
    expect(q.quantumM).toBe(0.1);
    const back = dequantiseHeights(q);
    heights.forEach((h, i) => expect(Math.abs((back[i] as number) - h)).toBeLessThanOrEqual(0.05 + 1e-4));
  });

  it('widens the step by whole doublings when the span would not fit 16 bits', () => {
    const heights = sample(10, (i) => i * 2_500);
    const q = quantiseHeights(heights);
    expect(q.quantumM).toBeCloseTo(0.1 * 2 ** Math.round(Math.log2(q.quantumM / 0.1)), 12);
    expect(q.quantumM).toBeGreaterThan(0.1);
    const back = dequantiseHeights(q);
    heights.forEach((h, i) => expect(Math.abs((back[i] as number) - h)).toBeLessThanOrEqual(q.quantumM / 2 + 1e-4));
  });

  it('marks a missing height 65535 and gives it back as NaN', () => {
    const q = quantiseHeights(Float32Array.of(5, Number.NaN, 7));
    expect(q.q[1]).toBe(65_535);
    expect(Number.isNaN(dequantiseHeights(q)[1])).toBe(true);
  });

  it('gives two tiles the same height at a shared node whatever else they hold', () => {
    const a = dequantiseHeights(quantiseHeights(Float32Array.of(1_234.5678, 10, 20)));
    const b = dequantiseHeights(quantiseHeights(Float32Array.of(1_234.5678, 900, 2_000)));
    expect(a[0]).toBe(b[0]);
  });

  it('keeps the base a whole number of steps when the lowest height is not on a step', () => {
    const heights = Float32Array.of(12.34, 50, 33.3);
    const q = quantiseHeights(heights);
    expect(q.baseUnits).toBe(123);
    expect(Number.isInteger(q.baseUnits)).toBe(true);
    const back = dequantiseHeights(q);
    heights.forEach((h, i) => expect(Math.abs((back[i] as number) - h)).toBeLessThanOrEqual(0.05 + 1e-4));
  });

  it('gives two tiles the same height at a shared node when their lows are off the step', () => {
    const a = dequantiseHeights(quantiseHeights(Float32Array.of(1_234.5678, 12.34, 20)));
    const b = dequantiseHeights(quantiseHeights(Float32Array.of(1_234.5678, 17.77, 2_000)));
    expect(a[0]).toBe(b[0]);
  });

  it('steps by level: 0.1 m up to level 1, then doubling, so any relief of the Moon fits level 3', () => {
    expect([0, 1, 2, 3].map(levelQuantumM)).toEqual([0.1, 0.1, 0.2, 0.4]);
    // The Moon spans about 20 km from its lowest floor to its highest rim.
    const moon = quantiseHeights(Float32Array.of(-9_200, 10_800), levelQuantumM(3));
    expect(moon.quantumM).toBe(0.4);
  });

  it('starts at the step it is given and still widens when the span needs it', () => {
    expect(quantiseHeights(Float32Array.of(0, 100), 0.4).quantumM).toBe(0.4);
    expect(quantiseHeights(Float32Array.of(0, 30_000), 0.4).quantumM).toBe(0.8);
  });

  it('gives neighbours that share a step the same height at a shared node, whatever their relief', () => {
    const step = levelQuantumM(3);
    const flat = dequantiseHeights(quantiseHeights(Float32Array.of(1_234.5678, 10, 20), step));
    const deep = dequantiseHeights(quantiseHeights(Float32Array.of(1_234.5678, -9_000, 12_000), step));
    expect(flat[0]).toBe(deep[0]);
  });

  it('survives the text form: base64 of 16-bit little-endian, 2 bytes a height', () => {
    const q = quantiseHeights(Float32Array.of(-50, 0, 25.25, Number.NaN));
    const text = encodeQuantised(q);
    expect(Buffer.from(text, 'base64')).toHaveLength(8);
    const back = decodeQuantised(text, q.quantumM, q.baseUnits);
    expect(back[0]).toBeCloseTo(-50, 1);
    expect(back[2]).toBeCloseTo(25.25, 1);
    expect(Number.isNaN(back[3])).toBe(true);
  });

  it('copes with a tile of no heights', () => {
    const q = quantiseHeights(Float32Array.of(Number.NaN, Number.NaN));
    expect([...q.q]).toEqual([65_535, 65_535]);
  });
});
