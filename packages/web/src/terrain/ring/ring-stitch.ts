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
 * Stitching a level to its parent (VENT-46): each level reads the LOLA
 * tiers in its own order, so a fine node on the edge of its window sits
 * metres from the parent's surface (475 m on a coarse fixture), more than
 * a skirt can hide. A node's height is blended toward the parent's surface
 * (the parent's lattice, bilinear: the line the parent's mesh draws along
 * the window edge) over the cells normals already blend over: all of it on
 * the edge, none eight cells in. Geomorphing, once, at placement. Pure.
 */
import { TILE_CELLS, sampleDirection, tileGeoref, type TileKey }
  from '@ventana/sim';
import { cellOf } from './ring-cells';
import { heightAtDir } from './ring-local';
import type { RingStore, RingTile } from './ring-store';
import { BLEND_CELLS, blendOf, depthIn, type Window } from './ring-window';

const N = TILE_CELLS + 1;

/** What a node needs to stitch itself: the store, its level's window. */
export interface Stitch {
  readonly store: RingStore;
  readonly window: Window | undefined;
  /** How many levels the session draws: the top one has no parent. */
  readonly levels: number;
}

/** How many cells inside `window`'s edge node `(row, col)` of `tile` lies. */
export function depthAt(
  tile: RingTile,
  row: number,
  col: number,
  window: Window,
): number {
  const [cx, cy] = cellOf(tile.key, row, col);
  return depthIn(window, cx, cy + 1);
}

/** How much of the parent's height node `(row, col)` takes; 0: none. */
export function stitchAt(
  tile: RingTile,
  row: number,
  col: number,
  stitch: Stitch | undefined,
): number {
  if (!stitch?.window || tile.key.level >= stitch.levels - 1) return 0;
  return blendOf(depthAt(tile, row, col, stitch.window));
}

/**
 * The height of node `(row, col)` of `tile` over the sphere, stitched: its
 * own height away from the window's edge, the parent's on it, NaN kept.
 */
export function stitchedHeight(
  tile: RingTile,
  row: number,
  col: number,
  stitch: Stitch | undefined,
): number {
  const own = tile.heights[row * N + col] ?? Number.NaN;
  const w = stitchAt(tile, row, col, stitch);
  if (!stitch || w === 0 || Number.isNaN(own)) return own;
  const dir = sampleDirection(tileGeoref(tile.key), row, col);
  const level = tile.key.level;
  const parent = heightAtDir(stitch.store,
    { from: level + 1, levels: level + 2 }, dir);
  return Number.isNaN(parent) ? own : own * (1 - w) + parent * w;
}

/**
 * Whether any node of tile `key` lies within the blend band of `window`'s
 * edge: only those tiles change when their parent arrives. Depth is the
 * least of four linear terms, concave, so its least over a tile is at a
 * corner.
 */
export function inBand(key: TileKey, window: Window | undefined): boolean {
  if (!window) return false;
  const [x0, x1] = [key.x * TILE_CELLS, (key.x + 1) * TILE_CELLS];
  const [y0, y1] = [key.y * TILE_CELLS, (key.y + 1) * TILE_CELLS];
  return [[x0, y0], [x0, y1], [x1, y0], [x1, y1]].some(
    ([cx = 0, cy = 0]) => depthIn(window, cx, cy) < BLEND_CELLS);
}
