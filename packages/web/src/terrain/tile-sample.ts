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
 * Which sample of a tile lies where (VENT-34): the one nearest a spot in
 * the session's frame. Pure.
 */
import type { HeightTile } from './tile';
import { stepOf } from './tile-mesh';

/**
 * The index of the sample nearest `east`, `north` metres from the
 * session's origin, clamped to the tile (the site's, for the Sun's mask).
 */
export function nearestSample(
  tile: HeightTile,
  east: number,
  north: number,
): number {
  const { n, sizeM } = tile;
  const step = stepOf(tile);
  const col = Math.round((east - tile.originEast + sizeM / 2) / step);
  const row = Math.round((sizeM / 2 - (north - tile.originNorth)) / step);
  const clamp = (v: number): number => Math.min(Math.max(v, 0), n - 1);
  return clamp(row) * n + clamp(col);
}
