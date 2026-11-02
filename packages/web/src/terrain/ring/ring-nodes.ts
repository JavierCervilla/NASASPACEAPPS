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
 * Reading a ring's nodes by lattice position (VENT-46). A node on a shared
 * edge is in two tiles on each axis; any loaded one gives the same height.
 * Pure.
 */
import { TILE_CELLS } from '@ventana/sim';
import type { RingStore, RingTile } from './ring-store';

export interface Located {
  readonly tile: RingTile;
  readonly row: number;
  readonly col: number;
}

/**
 * The loaded tile that holds node `(gx, gy)` of `level`'s lattice (`gy`
 * counted north) and its row and column there.
 */
export function locate(
  store: RingStore,
  level: number,
  gx: number,
  gy: number,
): Located | undefined {
  const xs = [Math.floor(gx / TILE_CELLS)];
  const ys = [Math.floor(gy / TILE_CELLS)];
  if (gx % TILE_CELLS === 0) xs.push(gx / TILE_CELLS - 1);
  if (gy % TILE_CELLS === 0) ys.push(gy / TILE_CELLS - 1);
  for (const x of xs) {
    for (const y of ys) {
      const tile = store.get(level, x, y);
      const at = { row: (y + 1) * TILE_CELLS - gy, col: gx - x * TILE_CELLS };
      if (tile) return { tile, ...at };
    }
  }
  return undefined;
}

/** The height at node `(gx, gy)`; NaN when no loaded tile holds it. */
export function nodeHeight(
  store: RingStore,
  level: number,
  gx: number,
  gy: number,
): number {
  const found = locate(store, level, gx, gy);
  if (!found) return Number.NaN;
  const { tile, row, col } = found;
  return tile.heights[row * tile.n + col] ?? Number.NaN;
}

/** The finest resolution any loaded tile reports; 0 with none. */
export function finest(store: RingStore): number {
  const found = [...store.tiles.values()].map((t) => t.resolutionM);
  return found.length === 0 ? 0 : Math.min(...found);
}

/** Marks the ring whole and tells whoever waited. */
export function finish(store: RingStore): void {
  store.complete = true;
  for (const done of store.onDone) done();
}
