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
 * The Sun's shadow over the rings beyond the near ground (VENT-46): each
 * level from the second reads a grid of its own, 257 x 257 over 16, 64 and
 * 256 km (62.5 m to 1 km), resampled from the loaded tiles once the ring is
 * whole and marched toward the Sun as the near ground is (sun-shade.ts),
 * in slices so no turn of the page blocks. A newer Sun supersedes the old
 * run. Hard shadows at the level's resolution; beyond a grid's edge the
 * ground is lit, and the Sun the far horizon hides darkens the whole view
 * through sun-mask.ts, not here.
 */
import { LOCAL_N, localSize } from '../ring/ring-local';
import type { RingView } from '../ring/ring-state';
import { sunLit } from '../sun-shade';
import type { LitGrid } from './ring-entry';
import { rowsFrom, sampleRows, tileOf, type Shade, type Sun, type Task }
  from './ring-shade-rows';
import type { Slicer } from './slicer';

/** Rows shaded in one job. */
const SHADE_ROWS = 16;

export interface FarShade {
  /** Shades the far levels for the Sun at `azDeg`, `elDeg`. */
  readonly run: (sun: Sun) => void;
}

/** Does one job of the task: rows resampled, or rows shaded. */
function advance(s: Shade, task: Task, sun: Sun, version: number): void {
  if (version !== s.version) return;
  if (task.sampled < LOCAL_N) sampleRows(s, task);
  else {
    s.grids.set(task.level, task.ys);
    const rows = rowsFrom(task.shaded, SHADE_ROWS);
    sunLit(tileOf(task), task.ys, sun, { into: task.lit, rows });
    task.shaded = rows[1];
  }
  if (task.shaded < LOCAL_N) queueTask(s, task, sun, version);
  else s.apply(task.level, { lit: task.lit, sizeM: localSize(task.level) });
}

function queueTask(s: Shade, task: Task, sun: Sun, version: number): void {
  const job = (): void => advance(s, task, sun, version);
  s.slicer.add(`far${task.level}`, 50 + task.level, job);
}

/** Starts a run for `sun`, superseding the last. */
function start(s: Shade, sun: Sun): void {
  s.version += 1;
  const size = LOCAL_N * LOCAL_N;
  for (let level = 1; level < s.view.tier.levels; level++) {
    const known = s.grids.get(level);
    const task: Task = { level, ys: known ?? new Float32Array(size),
      lit: new Float32Array(size), sampled: known ? LOCAL_N : 0, shaded: 0 };
    queueTask(s, task, sun, s.version);
  }
}

/** The far shading of `view`, its grids handed to `apply` as they finish. */
export function createFarShade(
  view: RingView,
  slicer: Slicer,
  apply: (level: number, grid: LitGrid) => void,
): FarShade {
  const s: Shade = { view, slicer, apply, grids: new Map(), version: 0 };
  return { run: (sun) => view.store.whenComplete(() => start(s, sun)) };
}
