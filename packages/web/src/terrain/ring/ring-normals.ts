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
 * The smooth normals of a ring tile (VENT-46), from the positions of its
 * neighbours, across the tile's edge too when the neighbouring tile of its
 * level is loaded, so a seam between tiles shows no crease; a node whose
 * neighbour is missing leans on the other side. Near the edge of its
 * level's window a node's normal is mixed toward the one over 4 cells, which
 * is exactly the coarser level's normal at the nodes they share, so the
 * seam between levels shows none either. Pure.
 */
import { TILE_CELLS } from '@ventana/sim';
import type { Vec3 } from '../view-camera';
import type { Frame } from './ring-frame';
import { cellOf } from './ring-cells';
import { normalAt, positionGetter } from './ring-tangents';
import { depthAt, type Stitch } from './ring-stitch';
import type { RingStore, RingTile } from './ring-store';
import { BLEND_CELLS, blendOf, depthIn, type Window }
  from './ring-window';

export { BLEND_CELLS, blendOf } from './ring-window';

const N = TILE_CELLS + 1;
/** The parent's spacing, in this level's cells. */
const PARENT_STEP = 4;

export interface NormalContext {
  readonly store: RingStore;
  readonly frame: Frame;
  /** The window of the tile's level; with a parent above it, `blends`. */
  readonly window: Window | undefined;
  readonly blends: boolean;
  /** Heights stitched to the parent's (ring-stitch.ts), as the positions. */
  readonly stitch?: Stitch | undefined;
}

/** How much of the parent's normal node `(row, col)` of `tile` takes. */
function blendAt(t: RingTile, c: NormalContext, row: number, col: number) {
  if (!c.blends || !c.window) return 0;
  const [cx, cy] = cellOf(t.key, row, col);
  return blendOf(depthIn(c.window, cx, cy + 1));
}

/** Whether a restitch can have changed the normal of a node. */
function moved(t: RingTile, c: NormalContext, row: number, col: number) {
  const reach = BLEND_CELLS + PARENT_STEP;
  return !c.window || depthAt(t, row, col, c.window) <= reach;
}

/** The unit vector between `a` and `b`, `w` of the way to `b`. */
function mixNormals(a: Vec3, b: Vec3, w: number): Vec3 {
  const m = a.map((v, k) => v * (1 - w) + (b[k] ?? 0) * w);
  const len = Math.hypot(...m) || 1;
  return [(m[0] ?? 0) / len, (m[1] ?? 1) / len, (m[2] ?? 0) / len];
}

/**
 * The unit normals of every node of `tile`; with `previous`, those of an
 * earlier call, only the nodes the stitch can have moved are worked again.
 */
export function gridNormals(
  tile: RingTile,
  positions: Float32Array,
  c: NormalContext,
  previous?: Float32Array,
): Float32Array {
  const at = positionGetter(tile, positions, c);
  const out = previous ?? new Float32Array(N * N * 3);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (previous && !moved(tile, c, row, col)) continue;
      const w = blendAt(tile, c, row, col);
      const near = normalAt(at, row, col, 1) ?? [0, 1, 0];
      const wide = w > 0 ? normalAt(at, row, col, PARENT_STEP) : null;
      out.set(wide ? mixNormals(near, wide, w) : near, (row * N + col) * 3);
    }
  }
  return out;
}
