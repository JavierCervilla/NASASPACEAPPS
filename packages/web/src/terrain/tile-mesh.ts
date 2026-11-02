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
 * A height tile as mesh buffers (VENT-34), in the session's local frame:
 * x east, y up, z south (Three.js looks down -z, so north is ahead), the
 * heights lowered by the Moon's curvature from the session's origin
 * (`d² / 2R`, docs/terrain-api.md) so the tangent-plane mesh falls away
 * as the ground does. Each cell is two triangles split along its
 * north-east to south-west diagonal; {@link surfaceHeight} reads the same
 * triangles, so a rock or the astronaut stands on the drawn ground. Pure
 * and transferable: a Web Worker can build the buffers.
 */
import type { HeightTile } from './tile';

/** IAU mean radius of the Moon, metres (the API's sphere). */
export const MOON_RADIUS_M = 1_737_400;

/** Metres between samples. */
export const stepOf = (tile: HeightTile): number => tile.sizeM / (tile.n - 1);

/**
 * The mesh's height of every sample, row-major as the tile: the API's
 * height less the curvature's fall at its distance from the origin.
 */
export function meshHeights(tile: HeightTile): Float32Array {
  const { n, sizeM, heights, originEast, originNorth } = tile;
  const step = stepOf(tile);
  const out = new Float32Array(n * n);
  for (let row = 0; row < n; row++) {
    const north = originNorth + sizeM / 2 - row * step;
    for (let col = 0; col < n; col++) {
      const east = originEast - sizeM / 2 + col * step;
      const fall = (east * east + north * north) / (2 * MOON_RADIUS_M);
      out[row * n + col] = (heights[row * n + col] ?? 0) - fall;
    }
  }
  return out;
}

/** The triangles of an `n` x `n` grid, counter-clockwise seen from above. */
export function gridIndex(n: number): Uint32Array {
  const out = new Uint32Array((n - 1) * (n - 1) * 6);
  let k = 0;
  for (let row = 0; row < n - 1; row++) {
    for (let col = 0; col < n - 1; col++) {
      const a = row * n + col;
      out.set([a, a + n, a + 1, a + 1, a + n, a + n + 1], k);
      k += 6;
    }
  }
  return out;
}

export interface TileBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly index: Uint32Array;
}

/** Positions, smooth normals (central differences) and triangles. */
export function tileBuffers(tile: HeightTile, ys: Float32Array): TileBuffers {
  const { n, sizeM, originEast, originNorth } = tile;
  const step = stepOf(tile);
  const positions = new Float32Array(n * n * 3);
  const normals = new Float32Array(n * n * 3);
  const y = (r: number, c: number): number =>
    ys[Math.min(Math.max(r, 0), n - 1) * n + Math.min(Math.max(c, 0), n - 1)] ??
    0;
  for (let i = 0; i < n * n; i++) {
    const [row, col] = [Math.floor(i / n), i % n];
    const east = originEast - sizeM / 2 + col * step;
    const north = originNorth + sizeM / 2 - row * step;
    positions.set([east, ys[i] ?? 0, -north], i * 3);
    const dx = (y(row, col + 1) - y(row, col - 1)) / (2 * step);
    const dz = (y(row + 1, col) - y(row - 1, col)) / (2 * step);
    const len = Math.hypot(dx, 1, dz);
    normals.set([-dx / len, 1 / len, -dz / len], i * 3);
  }
  return { positions, normals, index: gridIndex(n) };
}

/**
 * The drawn ground's height at `east`, `north` metres from the session's
 * origin, on the tile's triangles; clamped to the tile's edge.
 */
export function surfaceHeight(
  tile: HeightTile,
  ys: Float32Array,
  east: number,
  north: number,
): number {
  const { n, sizeM } = tile;
  const step = stepOf(tile);
  const ex = east - tile.originEast + sizeM / 2;
  const ny = sizeM / 2 - (north - tile.originNorth);
  const fx = Math.min(Math.max(ex / step, 0), n - 1.000001);
  const fy = Math.min(Math.max(ny / step, 0), n - 1.000001);
  const [col, row] = [Math.floor(fx), Math.floor(fy)];
  const [u, v] = [fx - col, fy - row];
  const at = (r: number, c: number): number => ys[r * n + c] ?? 0;
  const [ha, hb] = [at(row, col), at(row, col + 1)];
  const [hc, hd] = [at(row + 1, col), at(row + 1, col + 1)];
  if (u + v <= 1) return ha + (hb - ha) * u + (hc - ha) * v;
  return hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - v);
}
