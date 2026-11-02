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
 * The global tiling of the 3D view's relief (VENT-46): which scheme a point
 * belongs to, where each tile's samples lie, and that neighbours and parent
 * levels share their samples exactly. Pure geometry, no heights.
 */
import { describe, expect, it } from 'vitest';
import { pixelOf, type DemGrid } from '../src/dem-grid.ts';
import { unitVector, type Vec3 } from '../src/horizon.ts';
import { sampleDirection, tileGeoref } from '../src/tile-georef.ts';
import { isTileKey } from '../src/tile-key.ts';
import { tileContaining } from '../src/tile-locate.ts';
import {
  LUNAR_RADIUS_M,
  TILE_CELLS,
  TILE_SAMPLES,
  levelSize,
  nominalSpacingM,
  schemeFor,
  type TileKey,
} from '../src/tile-scheme.ts';

const LAST = TILE_SAMPLES - 1;
const dir = (key: TileKey, row: number, col: number): Vec3 =>
  sampleDirection(tileGeoref(key), row, col);

describe('schemeFor', () => {
  it('uses the polar plane from 60° of latitude to each pole', () => {
    expect(schemeFor(-85)).toBe('polar-south');
    expect(schemeFor(-60)).toBe('polar-south');
    expect(schemeFor(60)).toBe('polar-north');
    expect(schemeFor(90)).toBe('polar-north');
  });

  it('uses the lat-lon grid between', () => {
    expect(schemeFor(-59.99)).toBe('latlon');
    expect(schemeFor(0)).toBe('latlon');
    expect(schemeFor(59.99)).toBe('latlon');
  });
});

describe('levels', () => {
  it('make 2, 8, 32 and 128 km tiles of 128 cells on the polar plane', () => {
    expect([0, 1, 2, 3].map((l) => levelSize('polar-south', l))).toEqual([
      2_000, 8_000, 32_000, 128_000,
    ]);
    expect(TILE_CELLS).toBe(128);
    expect(TILE_SAMPLES).toBe(129);
  });

  it('make 1/16°, 1/4°, 1° and 4° tiles on the lat-lon grid', () => {
    expect([0, 1, 2, 3].map((l) => levelSize('latlon', l))).toEqual([
      1 / 16, 1 / 4, 1, 4,
    ]);
  });

  it('space the nominal samples 15.6 m, 62.5 m, 250 m and 1 km apart', () => {
    expect([0, 1, 2, 3].map(nominalSpacingM)).toEqual([15.625, 62.5, 250, 1_000]);
  });
});

describe('isTileKey', () => {
  it('takes whole numbers inside the grid', () => {
    expect(isTileKey({ scheme: 'polar-south', level: 0, x: -3, y: 4 })).toBe(true);
    expect(isTileKey({ scheme: 'latlon', level: 3, x: 89, y: 0 })).toBe(true);
  });

  it('refuses a level, a number or a place off the grid', () => {
    const bad: TileKey[] = [
      { scheme: 'polar-south', level: 4, x: 0, y: 0 },
      { scheme: 'polar-south', level: -1, x: 0, y: 0 },
      { scheme: 'polar-south', level: 0, x: 0.5, y: 0 },
      { scheme: 'polar-south', level: 0, x: 900_000, y: 0 },
      { scheme: 'latlon', level: 3, x: 90, y: 0 },
      { scheme: 'latlon', level: 3, x: -1, y: 0 },
      { scheme: 'latlon', level: 0, x: 0, y: 1_400 },
    ];
    for (const key of bad) expect(isTileKey(key)).toBe(false);
  });
});

describe('polar tiles', () => {
  const south: TileKey = { scheme: 'polar-south', level: 0, x: 0, y: 0 };

  it('has the pole as the corner of four tiles: the south-west sample of (0,0)', () => {
    const [px, py, pz] = dir(south, LAST, 0);
    expect(px).toBeCloseTo(0, 15);
    expect(py).toBeCloseTo(0, 15);
    expect(pz).toBe(-1);
    const north = { scheme: 'polar-north', level: 0, x: -1, y: -1 } as const;
    expect(dir(north, 0, LAST)[2]).toBe(1);
  });

  it('returns unit vectors', () => {
    for (const [r, c] of [[0, 0], [64, 64], [LAST, LAST], [10, 100]] as const) {
      const v = dir({ scheme: 'polar-south', level: 2, x: 1, y: 2 }, r, c);
      expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    }
  });

  it('agrees with the LOLA polar grids: the sample falls on its own plane pixel', () => {
    for (const pole of ['south', 'north'] as const) {
      const grid: DemGrid = {
        id: 'p', lines: 1, samples: 1, metresPerDn: 1, radiusM: LUNAR_RADIUS_M,
        projection: { kind: 'polar', pole, poleLine: 0, poleSample: 0, metresPerPixel: 1 },
        dnAt: () => 0,
      };
      const key = { scheme: `polar-${pole}`, level: 1, x: 3, y: -2 } as TileKey;
      const g = tileGeoref(key);
      if (g.kind !== 'polar') throw new Error('polar');
      const [line, sample] = pixelOf(grid, dir(key, 20, 90));
      expect(sample).toBeCloseTo(g.minX + 90 * g.spacingM, 4);
      expect(line).toBeCloseTo(-(g.maxY - 20 * g.spacingM), 4);
    }
  });

  it('keeps the ground spacing within 0.5 % of the plane spacing at 85°', () => {
    const key = tileContaining('polar-south', 0, -85, 30);
    const a = dir(key, 60, 60);
    const b = dir(key, 60, 61);
    const angle = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
    const ground = angle * LUNAR_RADIUS_M;
    const k = 2 / (1 + Math.sin((85 * Math.PI) / 180));
    expect(ground * k).toBeCloseTo(15.625, 1);
  });
});

describe('lat-lon tiles', () => {
  it('lays row 0 on the north edge and column 0 on the west edge', () => {
    const key: TileKey = { scheme: 'latlon', level: 0, x: 100, y: -50 };
    const north = (-50 + 1) / 16;
    const west = 100 / 16;
    expect(dir(key, 0, 0)).toEqual(unitVector(north, west));
    expect(dir(key, LAST, LAST)).toEqual(unitVector(-50 / 16, 101 / 16));
  });

  it('closes the 0° E seam: the east edge of the last tile is the west edge of the first', () => {
    const last: TileKey = { scheme: 'latlon', level: 0, x: 5_759, y: 3 };
    const first: TileKey = { scheme: 'latlon', level: 0, x: 0, y: 3 };
    for (let row = 0; row < TILE_SAMPLES; row++) {
      expect(dir(last, row, LAST)).toEqual(dir(first, row, 0));
    }
  });
});

describe.each([
  ['polar-south', 4, -3],
  ['polar-north', -2, 5],
  ['latlon', 7_000 % 5_760, 12],
  ['latlon', 5_759, -20],
] as const)('%s tile (%i, %i)', (scheme, x, y) => {
  const key: TileKey = { scheme, level: 0, x, y };

  it('shares its east edge with the next tile east, sample for sample', () => {
    const east: TileKey = { ...key, x: scheme === 'latlon' ? (x + 1) % 5_760 : x + 1 };
    for (let row = 0; row < TILE_SAMPLES; row++) {
      expect(dir(key, row, LAST)).toEqual(dir(east, row, 0));
    }
  });

  it('shares its north edge with the next tile north', () => {
    const north: TileKey = { ...key, y: y + 1 };
    for (let col = 0; col < TILE_SAMPLES; col++) {
      expect(dir(key, 0, col)).toEqual(dir(north, LAST, col));
    }
  });
});

describe.each([
  ['polar-south', 2, -1],
  ['polar-north', -1, 3],
  ['latlon', 100, -7],
  ['latlon', 89, 3],
] as const)('%s parent level tile (%i, %i)', (scheme, x, y) => {
  it('has its samples at every 4th sample of each of its 16 children', () => {
    const parent: TileKey = { scheme, level: 1, x, y };
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const child: TileKey = { scheme, level: 0, x: 4 * x + a, y: 4 * y + b };
        for (let r = 0; r < TILE_SAMPLES; r += 4) {
          for (let c = 0; c < TILE_SAMPLES; c += 4) {
            const pr = (TILE_CELLS / 4) * (3 - b) + r / 4;
            const pc = (TILE_CELLS / 4) * a + c / 4;
            expect(dir(child, r, c)).toEqual(dir(parent, pr, pc));
          }
        }
      }
    }
  });
});

describe('tileContaining', () => {
  /** The point's place in the tile's own units: plane metres or degrees. */
  function placeIn(key: TileKey, lat: number, lon: number): [number, number] {
    const g = tileGeoref(key);
    const size = levelSize(key.scheme, key.level);
    if (g.kind === 'latlon') {
      return [(lon - g.westDeg) / size, (g.northDeg - lat) / size];
    }
    const [p0, p1, z] = unitVector(lat, lon);
    const k = (2 * LUNAR_RADIUS_M) / (1 + (g.pole === 'south' ? -z : z));
    const y = g.pole === 'south' ? k * p0 : -k * p0;
    return [(k * p1 - g.minX) / size, (g.maxY - y) / size];
  }

  it.each([
    ['polar-south', -85.5, 31],
    ['polar-south', -89.99, 30],
    ['polar-north', 84, 200],
    ['latlon', 10, 100],
    ['latlon', -33.3, 0.004],
    ['latlon', 20, 359.998],
  ] as const)('puts the %s point %f, %f inside its tile at every level', (scheme, lat, lon) => {
    for (const level of [0, 1, 2, 3]) {
      const key = tileContaining(scheme, level, lat, lon);
      expect(key).toMatchObject({ scheme, level });
      expect(isTileKey(key)).toBe(true);
      const [across, down] = placeIn(key, lat, lon);
      expect(across).toBeGreaterThanOrEqual(0);
      expect(across).toBeLessThan(1);
      // A point on a shared edge is in the tile north of it: its south edge.
      expect(down).toBeGreaterThan(0);
      expect(down).toBeLessThanOrEqual(1);
    }
  });
});
