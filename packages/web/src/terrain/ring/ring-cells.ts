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
 * Cells, nodes and the tiles that hold them (VENT-46): a cell `(cx, cy)`
 * lies between lattice lines `cx` and `cx + 1` east and `cy` and `cy + 1`
 * north; tile `(x, y)` holds columns `x * 128 ..` and, counted from its
 * north edge, row `r` is the cell `(y + 1) * 128 - 1 - r`. Whole-number
 * arithmetic. Pure.
 */
import { TILE_CELLS, levelSize, type TileKey, type TileScheme }
  from '@ventana/sim';

/** The tile with column `x`, row `y` at `level`; lat-lon wraps in `x`. */
export function tileAt(
  scheme: TileScheme,
  level: number,
  x: number,
  y: number,
): TileKey {
  if (scheme !== 'latlon') return { scheme, level, x, y };
  const across = Math.round(360 / levelSize(scheme, level));
  return { scheme, level, x: ((x % across) + across) % across, y };
}

/** The tile that holds the cell `(cx, cy)` of `level`, and its row, column. */
export function tileOfCell(
  scheme: TileScheme,
  level: number,
  cx: number,
  cy: number,
): { key: TileKey; row: number; col: number } {
  const [x, y] = [Math.floor(cx / TILE_CELLS), Math.floor(cy / TILE_CELLS)];
  const key = tileAt(scheme, level, x, y);
  return { key, row: (y + 1) * TILE_CELLS - 1 - cy, col: cx - x * TILE_CELLS };
}

/** The cell of tile `key`'s row `row`, column `col`. */
export function cellOf(
  key: TileKey,
  row: number,
  col: number,
): [number, number] {
  return [key.x * TILE_CELLS + col, (key.y + 1) * TILE_CELLS - 1 - row];
}

/** The key as the string the store and the meshes name a tile by. */
export const nameOf = (k: TileKey): string =>
  `${k.scheme}/${k.level}/${k.x}/${k.y}`;

