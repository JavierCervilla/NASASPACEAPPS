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
 * The near ground's height anywhere (VENT-34, VENT-46): a rock or the eye
 * stands on the near grid's triangles (each cell split along its
 * north-east to south-west diagonal), which follow the drawn rings to
 * within the resampling. Pure.
 */
import type { HeightTile } from './tile';

/** IAU mean radius of the Moon, metres (the API's sphere). */
export const MOON_RADIUS_M = 1_737_400;

/** Metres between samples. */
export const stepOf = (tile: HeightTile): number => tile.sizeM / (tile.n - 1);

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
