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
 * Which tile keys exist (VENT-46): whole numbers inside the part of the
 * Moon each scheme serves, so a request cannot name a tile at the far side of
 * the polar plane or past the lat-lon grid's usable latitudes.
 */
import {
  LUNAR_RADIUS_M,
  TILE_LEVELS,
  levelSize,
  type TileKey,
} from './tile-scheme.ts';

/** The lat-lon grid is served up to this latitude, both ways. */
const LATLON_MAX_LAT_DEG = 75;
/** The polar plane is served to this latitude from its pole. */
const POLAR_REACH_LAT_DEG = 45;
const DEG = Math.PI / 180;
const POLAR_REACH_M =
  2 * LUNAR_RADIUS_M * Math.tan(((90 - POLAR_REACH_LAT_DEG) / 2) * DEG);

/** The coordinate of `[a, a + size]` nearest to 0. */
function nearestToZero(tile: number, size: number): number {
  if (tile >= 0) return tile * size;
  return Math.min(0, (tile + 1) * size);
}

function polarInReach(key: TileKey): boolean {
  const size = levelSize(key.scheme, key.level);
  const reach = Math.hypot(
    nearestToZero(key.x, size),
    nearestToZero(key.y, size),
  );
  return reach <= POLAR_REACH_M;
}

function latlonInReach(key: TileKey): boolean {
  const size = levelSize('latlon', key.level);
  const south = key.y * size;
  const inside = key.x >= 0 && key.x < 360 / size;
  const reaches = south < LATLON_MAX_LAT_DEG;
  return inside && reaches && south + size > -LATLON_MAX_LAT_DEG;
}

/** Whether `key` names a tile the service can serve. */
export function isTileKey(key: TileKey): boolean {
  const whole = [key.level, key.x, key.y].every(Number.isInteger);
  if (!whole || key.level < 0 || key.level >= TILE_LEVELS) return false;
  return key.scheme === 'latlon' ? latlonInReach(key) : polarInReach(key);
}
