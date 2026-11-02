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
 * The drawn ground's height anywhere in the session's frame (VENT-34):
 * the tile that holds the spot, on its triangles; 0 off every tile. With
 * one tile today, and side by side tiles later, by the same call.
 */
import { surfaceHeight } from '../tile-mesh';
import type { PlacedTile } from './scene-types';

export type Ground = (east: number, north: number) => number;

/** Whether `east`, `north` lies on `placed`. */
const holds = ({ tile }: PlacedTile, east: number, north: number): boolean =>
  Math.abs(east - tile.originEast) <= tile.sizeM / 2 &&
  Math.abs(north - tile.originNorth) <= tile.sizeM / 2;

/** The ground of `tiles`. */
export function groundOf(tiles: readonly PlacedTile[]): Ground {
  return (east, north) => {
    const placed = tiles.find((t) => holds(t, east, north)) ?? tiles[0];
    if (!placed) return 0;
    return surfaceHeight(placed.tile, placed.ys, east, north);
  };
}
