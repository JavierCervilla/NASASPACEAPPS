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
 * Where a point sits on the tiling's lattices (VENT-46): every level is a
 * lattice of cells that belongs to the whole Moon, so a point is a plane
 * coordinate and a number of cells (ring-cells.ts finds the tile).
 */
import {
  LUNAR_RADIUS_M,
  TILE_CELLS,
  levelSize,
  planePoint,
  type TileScheme,
} from '@ventana/sim';
import type { Vec3 } from '../view-camera';

const DEG = 180 / Math.PI;

/** The plane's units a lattice step covers (metres, or degrees). */
export const stepOf = (scheme: TileScheme, level: number): number =>
  levelSize(scheme, level) / TILE_CELLS;

/** The point `dir` as plane coordinates (polar: metres; lat-lon: °E, °N). */
export function planeOf(scheme: TileScheme, dir: Vec3): [number, number] {
  if (scheme === 'latlon') {
    const lon = (Math.atan2(dir[1], dir[0]) * DEG + 360) % 360;
    return [lon, Math.asin(Math.max(-1, Math.min(1, dir[2]))) * DEG];
  }
  const pole = scheme === 'polar-south' ? 'south' : 'north';
  const lat = Math.asin(Math.max(-1, Math.min(1, dir[2]))) * DEG;
  const lon = Math.atan2(dir[1], dir[0]) * DEG;
  return planePoint(pole, lat, lon);
}

/** The point `dir` in cells of `level`'s lattice, fractions kept. */
export function latticeOf(
  scheme: TileScheme,
  level: number,
  dir: Vec3,
): [number, number] {
  const [px, py] = planeOf(scheme, dir);
  const step = stepOf(scheme, level);
  return [px / step, py / step];
}

/** The sphere's radius, for callers that place by arc length. */
export const MOON_M = LUNAR_RADIUS_M;
