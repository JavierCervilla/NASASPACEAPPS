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
 * What is drawn where, from what is loaded (VENT-46): a cell of a level is
 * drawn when its tile is loaded, it lies in the level's window
 * (ring-window.ts) and the finer level has not covered it. A missing fine
 * tile is a hole the parent fills (VENT-45's 404); nothing else decides.
 * Pure.
 */
import { tileOfCell } from './ring-cells';
import type { RingStore } from './ring-store';
import { inWindow, type Window } from './ring-window';

const RATIO = 4;

export interface Layout {
  readonly store: RingStore;
  readonly windows: readonly Window[];
}

function loaded(layout: Layout, level: number, cx: number, cy: number) {
  const { key } = tileOfCell(layout.store.scheme, level, cx, cy);
  return layout.store.get(level, key.x, key.y) !== undefined;
}

/** Whether the finer level draws the cells under `(cx, cy)` of `level`. */
function covered(layout: Layout, level: number, cx: number, cy: number) {
  const fine = level - 1;
  const w = layout.windows[fine];
  if (!w) return false;
  const [fx, fy] = [cx * RATIO, cy * RATIO];
  return inWindow(w, fx, fy) && loaded(layout, fine, fx, fy);
}

/** Whether the cell `(cx, cy)` of `level` is drawn at all. */
export function drawn(
  layout: Layout,
  level: number,
  cx: number,
  cy: number,
): boolean {
  const w = layout.windows[level];
  if (!w || !inWindow(w, cx, cy)) return false;
  return loaded(layout, level, cx, cy) && !covered(layout, level, cx, cy);
}
