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
 * The height tile around a point (VENT-34): a fixed n x n grid in the local
 * tangent plane, each sample the height of the point on the sphere under
 * it, from the finest grid that covers it. Synthetic grids only.
 */
import { describe, expect, it } from 'vitest';
import { arrayGrid, demHeightAt, type DemGrid } from '../src/dem-grid.ts';
import { unitVector } from '../src/horizon.ts';
import { decodeHeights, encodeHeights } from '../src/tile-codec.ts';
import { terrainTile } from '../src/terrain-tile.ts';

const R = 1_737_400;
const N = 257;
const SIZE = 4_000;
const HALF = (N - 1) / 2;
const M_PER_DEG = (R * Math.PI) / 180;

/** A crop of a cylindrical grid of `ppd` pixels per degree, 40 x 40, whose
 * pixel (20, 20) is at lat 0, lon 100. DN of a pixel from `dn`. */
function crop(id: string, ppd: number, dn: (l: number, s: number) => number) {
  const lines = 40;
  const samples = 40;
  const meta = {
    id,
    lines,
    samples,
    metresPerDn: 1,
    radiusM: R,
    projection: {
      kind: 'cylindrical' as const,
      pixelsPerDeg: ppd,
      lineOffset: 20,
      sampleOffset: 20 - (100 - 180) * ppd,
      centerLonDeg: 180,
    },
  };
  const data = new Int16Array(lines * samples);
  for (let l = 0; l < lines; l++) {
    for (let s = 0; s < samples; s++) data[l * samples + s] = dn(l, s);
  }
  return arrayGrid(meta, data);
}

const AT_100E = { latDeg: 0, lonEastDeg: 100 };
const flat = (h: number) => crop('flat', 100, () => h);

describe('terrainTile on a flat grid', () => {
  it('is n x n zeros around the ground height, every sample covered', () => {
    const tile = terrainTile([flat(70)], AT_100E, SIZE, N);
    expect(tile.heights).toHaveLength(N * N);
    expect(tile.groundM).toBe(70);
    expect(tile.heights.every((h) => h === 0)).toBe(true);
    expect(tile.covered).toBe(N * N);
    expect(tile.stopsByGrid).toEqual({ flat: N * N });
  });
});

describe('terrainTile on a slope', () => {
  // 1 m of height per pixel, 100 pixels per degree, along the longitude.
  const grid = crop('slope', 100, (_l, s) => s);
  const tile = terrainTile([grid], AT_100E, SIZE, N);
  const at = (row: number, col: number) => tile.heights[row * N + col] as number;

  it('rises toward the east and not toward the north', () => {
    const rise = (SIZE / 2 / M_PER_DEG) * 100;
    expect(at(HALF, N - 1)).toBeCloseTo(rise, 2);
    expect(at(HALF, 0)).toBeCloseTo(-rise, 2);
    expect(at(0, HALF)).toBeCloseTo(0, 2);
    expect(at(N - 1, HALF)).toBeCloseTo(0, 2);
  });

  it('lays rows from north to south and columns from west to east', () => {
    const lat = (SIZE / 2 / R) * (180 / Math.PI);
    const north = demHeightAt(grid, unitVector(lat, 100));
    expect(at(0, HALF)).toBeCloseTo(north - tile.groundM, 6);
    expect(at(HALF, 0)).toBeLessThan(at(HALF, N - 1));
  });

  it('matches demHeightAt at the centre and the four corners', () => {
    const step = SIZE / (N - 1);
    expect(at(HALF, HALF)).toBe(0);
    for (const [row, col] of [[0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1]] as const) {
      const x = -SIZE / 2 + col * step;
      const y = SIZE / 2 - row * step;
      const theta = Math.hypot(x, y) / R;
      const [e, n] = [x / Math.hypot(x, y), y / Math.hypot(x, y)];
      const lat = Math.asin(n * Math.sin(theta)) * (180 / Math.PI);
      const lon = 100 + Math.atan2(e * Math.sin(theta), Math.cos(theta)) * (180 / Math.PI);
      const expected = demHeightAt(grid, unitVector(lat, lon)) - tile.groundM;
      expect(at(row, col)).toBeCloseTo(expected, 3);
    }
  });
});

describe('terrainTile with several grids', () => {
  it('takes each sample from the first grid that covers it', () => {
    // Fine grid: 0.001° pixels, 40 px = 0.04° = 4.4 km wide, so it covers
    // only the middle of an 8 km tile; the coarse one covers it all.
    const fine = crop('fine', 1_000, () => 100);
    const coarse = crop('coarse', 100, () => 10);
    const tile = terrainTile([fine, coarse], AT_100E, 8_000, N);
    expect(tile.groundM).toBe(100);
    expect(tile.stopsByGrid['fine']).toBeGreaterThan(0);
    expect(tile.stopsByGrid['coarse']).toBeGreaterThan(0);
    expect((tile.stopsByGrid['fine'] ?? 0) + (tile.stopsByGrid['coarse'] ?? 0)).toBe(N * N);
    expect(tile.heights[HALF * N + HALF]).toBe(0);
    expect(tile.heights[0]).toBe(10 - 100);
    expect(tile.covered).toBe(N * N);
  });

  it('leaves a sample no grid covers at the ground height and counts it out', () => {
    const tile = terrainTile([crop('small', 1_000, () => 5)], AT_100E, 8_000, N);
    expect(tile.covered).toBeLessThan(N * N);
    expect(tile.heights[0]).toBe(0);
  });

  it('refuses a centre no grid covers, and an even or tiny n', () => {
    const far = { latDeg: 40, lonEastDeg: 100 };
    expect(() => terrainTile([flat(0)], far, SIZE, N)).toThrow(RangeError);
    expect(() => terrainTile([flat(0)], AT_100E, SIZE, 256)).toThrow(RangeError);
    expect(() => terrainTile([flat(0)], AT_100E, SIZE, 1)).toThrow(RangeError);
  });
});

describe('terrainTile across the 0° seam of a global grid', () => {
  const lines = 180;
  const samples = 360;
  const meta = {
    id: 'globe',
    lines,
    samples,
    metresPerDn: 1,
    radiusM: R,
    projection: {
      kind: 'cylindrical' as const,
      pixelsPerDeg: 1,
      lineOffset: 89.5,
      sampleOffset: -0.5,
      centerLonDeg: 0,
    },
  };
  const dn = Int16Array.from({ length: lines * samples }, (_, i) => (i % samples) % 7);
  const globe: DemGrid = arrayGrid(meta, dn);

  it('is fully covered and agrees with demHeightAt on both sides', () => {
    const tile = terrainTile([globe], { latDeg: 20, lonEastDeg: 0 }, 8_000, N);
    expect(tile.covered).toBe(N * N);
    expect(tile.groundM).toBeCloseTo(demHeightAt(globe, unitVector(20, 0)), 9);
    expect(tile.heights.every(Number.isFinite)).toBe(true);
  });
});

describe('terrainTile on a polar grid', () => {
  const side = 600;
  const pole = (side - 1) / 2;
  const meta = {
    id: 'south',
    lines: side,
    samples: side,
    metresPerDn: 1,
    radiusM: R,
    projection: {
      kind: 'polar' as const,
      pole: 'south' as const,
      poleLine: pole,
      poleSample: pole,
      metresPerPixel: 20,
    },
  };
  // A cone: 0.1 m of height per metre from the pole.
  const dn = Int16Array.from({ length: side * side }, (_, i) =>
    Math.round(Math.hypot(Math.floor(i / side) - pole, (i % side) - pole) * 2),
  );
  const grid = arrayGrid(meta, dn);

  it('centred on the pole, is symmetric and rises with the distance', () => {
    const tile = terrainTile([grid], { latDeg: -90, lonEastDeg: 0 }, SIZE, N);
    expect(tile.covered).toBe(N * N);
    const at = (row: number, col: number) => tile.heights[row * N + col] as number;
    expect(at(HALF, HALF)).toBeCloseTo(0, 6);
    expect(at(0, HALF)).toBeCloseTo(at(N - 1, HALF), 0);
    expect(at(HALF, 0)).toBeCloseTo(SIZE / 2 / 10, -1);
  });
});

describe('the heights codec', () => {
  it('round-trips little-endian float32 through base64', () => {
    const heights = Float32Array.from([0, -1.5, 3.25, 1e4, -2e3]);
    const text = encodeHeights(heights);
    expect(text).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(decodeHeights(text)).toEqual(heights);
  });

  it('writes 4 bytes per height', () => {
    expect(encodeHeights(new Float32Array(N * N))).toHaveLength(Math.ceil((N * N * 4) / 3) * 4);
  });

  it('refuses a text that is not whole float32 values', () => {
    expect(() => decodeHeights('AAAA')).toThrow(RangeError);
  });
});
