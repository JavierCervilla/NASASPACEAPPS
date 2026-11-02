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
 * What each level draws where (VENT-46). Level `L` draws a window of 256 x
 * 256 of its cells (a tile of its own size each way of the site: 4, 16, 64
 * and 256 km across), aligned to the cells of level `L + 1`: the window is
 * 64 x 64 parent cells around the site's. The parent leaves a hole where
 * the finer level draws, hole edge and window edge are the same lines, and
 * levels nest exactly because tiles are 4 times each other. A cell is
 * drawn when its tile is loaded, it is in its level's window and the finer
 * level has not covered it: a missing fine tile is a hole the parent fills
 * (VENT-45's 404), nothing else decides. Pure.
 */
import { TILE_CELLS, TILE_LEVELS, type TileScheme } from '@ventana/sim';
import type { Vec3 } from '../view-camera';
import { latticeOf } from './ring-lattice';

/** Parent cells either side of the site, and the top level's own cells. */
const HALF_PARENT_CELLS = 32;
const HALF_TOP_CELLS = 128;
const RATIO = 4;

export interface Window {
  /** The window in units of `step` cells: `[lo, hi)` on each axis. */
  readonly lo: readonly [number, number];
  readonly hi: readonly [number, number];
  readonly step: number;
}

/** The windows of levels `0 .. levels - 1` around the site's `dir`. */
export function windowsFor(
  scheme: TileScheme,
  dir: Vec3,
  levels: number,
): Window[] {
  return Array.from({ length: levels }, (_, level) => {
    const top = level === TILE_LEVELS - 1;
    const [step, half] = top ? [1, HALF_TOP_CELLS] : [RATIO, HALF_PARENT_CELLS];
    const [fx, fy] = latticeOf(scheme, level, dir);
    const [cx, cy] = [Math.floor(fx / step), Math.floor(fy / step)];
    return { lo: [cx - half, cy - half], hi: [cx + half, cy + half], step };
  });
}

/** Whether the cell `(cx, cy)` of the window's level is inside it. */
export function inWindow(w: Window, cx: number, cy: number): boolean {
  const [x, y] = [Math.floor(cx / w.step), Math.floor(cy / w.step)];
  return x >= w.lo[0] && x < w.hi[0] && y >= w.lo[1] && y < w.hi[1];
}

/** How many cells inside the window's edge `(cx, cy)` lies (negative: out). */
export function depthIn(w: Window, cx: number, cy: number): number {
  const [x, y] = [cx / w.step, cy / w.step];
  const inner = Math.min(x - w.lo[0], w.hi[0] - x, y - w.lo[1], w.hi[1] - y);
  return inner * w.step;
}


/** Whether tile `(x, y)` of the window's level has a cell inside it. */
export function touches(w: Window, x: number, y: number): boolean {
  const reach = (t: number, axis: 0 | 1): boolean =>
    t * TILE_CELLS < w.hi[axis] * w.step &&
    (t + 1) * TILE_CELLS > w.lo[axis] * w.step;
  return reach(x, 0) && reach(y, 1);
}

/** Cells over which a level blends into its parent: normals, heights. */
export const BLEND_CELLS = 8;

/** How much of the parent a node `depthCells` inside the window takes. */
export function blendOf(depthCells: number): number {
  const t = Math.min(Math.max(1 - depthCells / BLEND_CELLS, 0), 1);
  return t * t * (3 - 2 * t);
}
