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
 * Which cells of a ring tile are drawn (VENT-46): those with data at the
 * level's mesh stride that the layout draws (ring-layout.ts). Pure.
 */
import { TILE_CELLS } from '@ventana/sim';
import { BLOCK, askBlock } from './ring-block';
import { cellOf } from './ring-cells';
import { drawn, type Layout } from './ring-layout';
import type { RingTile } from './ring-store';

export interface MeshSpec {
  readonly tile: RingTile;
  readonly layout: Layout;
  readonly valid: Uint8Array;
  readonly up: boolean;
  readonly stride: number;
  readonly skirtM: number;
}

/** Whether the cell at `row`, `col` of the lattice (any tile) is drawn. */
export function drawnOutside(s: MeshSpec, row: number, col: number): boolean {
  const [cx, cy] = cellOf(s.tile.key, row, col);
  return drawn(s.layout, s.tile.key.level, cx, cy);
}

/** Whether every node of the strided cell at `row`, `col` has data. */
function hasData(s: MeshSpec, row: number, col: number): boolean {
  for (let r = 0; r < s.stride; r++) {
    for (let c = 0; c < s.stride; c++) {
      if (!s.valid[(row + r) * TILE_CELLS + col + c]) return false;
    }
  }
  return true;
}

/** Marks the cells of the block at `br`, `bc` that are drawn and have data. */
function markBlock(s: MeshSpec, mask: Uint8Array, br: number, bc: number) {
  const ask = askBlock((r, c) => drawnOutside(s, r, c), s.stride, br, bc);
  for (let r = 0; r < BLOCK; r += s.stride) {
    for (let c = 0; c < BLOCK; c += s.stride) {
      if (ask(r, c) && hasData(s, br + r, bc + c)) {
        mask[(br + r) * TILE_CELLS + bc + c] = 1;
      }
    }
  }
}

/** Per strided cell of the tile, 1 when it is drawn. */
export function drawnMask(s: MeshSpec): Uint8Array {
  const mask = new Uint8Array(TILE_CELLS * TILE_CELLS);
  for (let br = 0; br < TILE_CELLS; br += BLOCK) {
    for (let bc = 0; bc < TILE_CELLS; bc += BLOCK) markBlock(s, mask, br, bc);
  }
  return mask;
}

/** The drawn strided cells of the tile: `[row, col]` of each. */
export function drawnCells(s: MeshSpec, mask = drawnMask(s)) {
  const out: [number, number][] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) out.push([Math.floor(i / TILE_CELLS), i % TILE_CELLS]);
  }
  return out;
}

