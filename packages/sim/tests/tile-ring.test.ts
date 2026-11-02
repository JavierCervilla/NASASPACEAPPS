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
 * Which tiles cover a ring around a point at each level (VENT-46), the list
 * a client asks for before it streams. Pure geometry.
 */
import { describe, expect, it } from 'vitest';
import { unitVector, type Vec3 } from '../src/horizon.ts';
import { pointAlong, horizontalDir } from '../src/ray-stops.ts';
import { LUNAR_RADIUS_M, TILE_LEVELS, schemeFor, type TileKey } from '../src/tile-scheme.ts';
import { tileContaining } from '../src/tile-locate.ts';
import { tilesAround } from '../src/tile-ring.ts';

const same = (a: TileKey, b: TileKey): boolean =>
  a.scheme === b.scheme && a.level === b.level && a.x === b.x && a.y === b.y;

/** Latitude and east longitude of the point `distM` from the centre on `azDeg`. */
function offset(lat: number, lon: number, distM: number, azDeg: number): [number, number] {
  const up = unitVector(lat, lon);
  const theta = distM / LUNAR_RADIUS_M;
  const p: Vec3 = pointAlong(up, horizontalDir(lat, lon, azDeg), Math.cos(theta), Math.sin(theta));
  const lonOut = ((Math.atan2(p[1], p[0]) * 180) / Math.PI + 360) % 360;
  return [(Math.asin(p[2]) * 180) / Math.PI, lonOut];
}

const CENTRES: ReadonlyArray<[number, number]> = [
  [-85.87, 61.34],
  [-89.9, 12],
  [-60.5, 300],
  [-59.9, 100],
  [0, 0.01],
  [35, 359.99],
  [75, 40],
  [89.5, 200],
];

describe('tilesAround', () => {
  it.each(CENTRES)('at %f, %f picks the scheme of the point and three levels', (lat, lon) => {
    const plan = tilesAround({ latDeg: lat, lonEastDeg: lon });
    expect(plan.scheme).toBe(schemeFor(lat));
    expect(plan.levels.map((l) => l.level)).toEqual([0, 1, 2]);
    expect(plan.levels.map((l) => l.sizeM)).toEqual([2_000, 8_000, 32_000]);
    for (const ring of plan.levels) {
      expect(ring.tiles.length).toBeGreaterThanOrEqual(1);
      expect(ring.tiles.length).toBeLessThanOrEqual(18);
      for (const t of ring.tiles) expect(t).toMatchObject({ scheme: plan.scheme, level: ring.level });
    }
  });

  it.each(CENTRES)('at %f, %f lists the tile under the point first at every level', (lat, lon) => {
    const plan = tilesAround({ latDeg: lat, lonEastDeg: lon }, TILE_LEVELS);
    expect(plan.levels).toHaveLength(TILE_LEVELS);
    for (const ring of plan.levels) {
      const under = tileContaining(plan.scheme, ring.level, lat, lon);
      expect(same(ring.tiles[0] as TileKey, under)).toBe(true);
    }
  });

  it.each(CENTRES)('at %f, %f covers every point within the level radius', (lat, lon) => {
    const plan = tilesAround({ latDeg: lat, lonEastDeg: lon }, TILE_LEVELS);
    for (const ring of plan.levels) {
      for (const az of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const [pl, po] = offset(lat, lon, ring.sizeM * 0.99, az);
        const t = tileContaining(plan.scheme, ring.level, pl, po);
        expect(ring.tiles.some((k) => same(k, t))).toBe(true);
      }
    }
  });

  it('lists each tile once', () => {
    const [ring] = tilesAround({ latDeg: -85.87, lonEastDeg: 61.34 }).levels;
    const keys = (ring?.tiles ?? []).map((k) => `${k.x},${k.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('takes the lower levels only when asked for fewer', () => {
    expect(tilesAround({ latDeg: 10, lonEastDeg: 10 }, 1).levels).toHaveLength(1);
    expect(() => tilesAround({ latDeg: 10, lonEastDeg: 10 }, 0)).toThrow(RangeError);
    expect(() => tilesAround({ latDeg: 10, lonEastDeg: 10 }, 5)).toThrow(RangeError);
  });

  it('wraps across the 0° E seam without listing a tile twice', () => {
    const [ring] = tilesAround({ latDeg: 0, lonEastDeg: 0.001 }).levels;
    const xs = (ring?.tiles ?? []).map((k) => k.x);
    expect(xs).toContain(0);
    expect(xs).toContain(5_759);
    expect(new Set(xs.map((x, i) => `${x},${ring?.tiles[i]?.y}`)).size).toBe(xs.length);
  });
});
