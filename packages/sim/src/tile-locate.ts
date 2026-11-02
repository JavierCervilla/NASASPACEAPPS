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
 * Which tile a point is in (VENT-46), so a client can find the tile under
 * its feet at any level. Pure.
 */
import { unitVector } from './horizon.ts';
import {
  LUNAR_RADIUS_M,
  levelSize,
  type TileKey,
  type TileScheme,
} from './tile-scheme.ts';

/**
 * The point's place on a pole's stereographic plane, metres: X toward 90° E
 * and Y toward 0° E (south) or 180° E (north), as the PDS grids lay them.
 */
export function planePoint(
  pole: 'south' | 'north',
  latDeg: number,
  lonEastDeg: number,
): [number, number] {
  const [p0, p1, z] = unitVector(latDeg, lonEastDeg);
  const south = pole === 'south';
  const k = (2 * LUNAR_RADIUS_M) / (1 + (south ? -z : z));
  return [k * p1, south ? k * p0 : -k * p0];
}

/**
 * The tile of `scheme` at `level` that has the point inside (one on a shared
 * edge belongs to the tile north and east of it).
 */
export function tileContaining(
  scheme: TileScheme,
  level: number,
  latDeg: number,
  lonEastDeg: number,
): TileKey {
  const size = levelSize(scheme, level);
  if (scheme === 'latlon') {
    const lon = ((lonEastDeg % 360) + 360) % 360;
    const [x, y] = [Math.floor(lon / size), Math.floor(latDeg / size)];
    return { scheme, level, x, y };
  }
  const pole = scheme === 'polar-south' ? 'south' : 'north';
  const [x, y] = planePoint(pole, latDeg, lonEastDeg);
  return { scheme, level, x: Math.floor(x / size), y: Math.floor(y / size) };
}
