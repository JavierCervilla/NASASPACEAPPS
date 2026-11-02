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
 * The pieces of the far shading's jobs (VENT-46): a level's task, resampling
 * a few rows of its grid at a time and the grid as the shadow march takes it.
 */
import { LOCAL_N, fillRows, localSize } from '../ring/ring-local';
import { fillGaps } from '../ring/ring-read';
import type { RingView } from '../ring/ring-state';
import type { HeightTile } from '../tile';
import type { LitGrid } from './ring-entry';
import type { Slicer } from './slicer';

/** Rows resampled in one job. */
export const SAMPLE_ROWS = 8;

export type Sun = { azDeg: number; elDeg: number };

export interface Task {
  readonly level: number;
  readonly ys: Float32Array;
  readonly lit: Float32Array;
  sampled: number;
  shaded: number;
}

export interface Shade {
  readonly view: RingView;
  readonly slicer: Slicer;
  readonly apply: (level: number, grid: LitGrid) => void;
  /** The resampled grid of each level, kept across Suns. */
  readonly grids: Map<number, Float32Array>;
  version: number;
}

export const tileOf = (task: Task): HeightTile => ({ key: `far${task.level}`,
  originEast: 0, originNorth: 0, n: LOCAL_N, sizeM: localSize(task.level),
  heights: task.ys, resolutionM: 0 });

/** The next rows `[from, from + step)` of a grid, ended at its edge. */
export const rowsFrom = (from: number, step: number): [number, number] =>
  [from, Math.min(from + step, LOCAL_N)];

/** Resamples a few more rows of the task's grid. */
export function sampleRows(s: Shade, task: Task): void {
  const reach = { from: task.level, levels: s.view.tier.levels };
  const rows = rowsFrom(task.sampled, SAMPLE_ROWS);
  const source = { store: s.view.store, frame: s.view.frame, reach };
  fillRows(task.ys, source, localSize(task.level), rows);
  task.sampled = rows[1];
  if (task.sampled >= LOCAL_N) fillGaps(task.ys);
}

