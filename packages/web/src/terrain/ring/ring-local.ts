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
 * The rings resampled onto regular grids of the session's frame (VENT-46):
 * the near ground the props stand on, the eye, the ridge and
 * the Sun's shadow march read a square grid of metres east and north, as
 * the legacy tile was (257 x 257, 4 km at 15.6 m), and the shadow march of
 * each coarser level reads its own (16, 64, 256 km). Each node reads the
 * finest loaded level that has data there, bilinear between lattice nodes.
 * The nodes are rows of heights in the frame's y, curvature included. Pure.
 */
import type { Vec3 } from '../view-camera';
import { MOON_M, latticeOf } from './ring-lattice';
import { fromLocal, type Frame } from './ring-frame';
import { nodeHeight } from './ring-nodes';
import type { RingStore } from './ring-store';

/** Samples a side of every local grid. */
export const LOCAL_N = 257;
/** The side of level 0's grid, metres; each level is 4 times it. */
const BASE_SIZE_M = 4_000;

/** The side of the local grid of `level`, metres. */
export const localSize = (level: number): number => BASE_SIZE_M * 4 ** level;

/** Which levels a read tries: from `from` to `levels - 1`. */
export interface Reach {
  readonly from: number;
  readonly levels: number;
}

/** Height at `dir` over the sphere from the finest level in reach with data. */
export function heightAtDir(store: RingStore, reach: Reach, dir: Vec3) {
  for (let level = reach.from; level < reach.levels; level++) {
    const [fx, fy] = latticeOf(store.scheme, level, dir);
    const [gx, gy] = [Math.floor(fx), Math.floor(fy)];
    const [u, v] = [fx - gx, fy - gy];
    const h = [nodeHeight(store, level, gx, gy),
      nodeHeight(store, level, gx + 1, gy),
      nodeHeight(store, level, gx, gy + 1),
      nodeHeight(store, level, gx + 1, gy + 1)];
    if (h.every(Number.isFinite)) {
      const [a = 0, b = 0, c = 0, d = 0] = h;
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }
  }
  return Number.NaN;
}

/** The frame's y of the surface `east`, `north` m from the site; NaN: none. */
export function surfaceY(
  store: RingStore,
  frame: Frame,
  reach: Reach,
  at: readonly [number, number],
): number {
  const [east, north] = at;
  let h = frame.groundM;
  for (let pass = 0; pass < 2; pass++) {
    const found = heightAtDir(store, reach, fromLocal(frame, east, north, h));
    if (Number.isNaN(found)) return found;
    h = found;
  }
  const r = MOON_M + h;
  const up = Math.sqrt(Math.max(r * r - east * east - north * north, 0));
  return up - MOON_M - frame.groundM;
}

/** Fills rows `from` to `to` (exclusive) of a local grid of `sizeM`. */
export function fillRows(
  ys: Float32Array,
  source: { store: RingStore; frame: Frame; reach: Reach },
  sizeM: number,
  rows: readonly [number, number],
): void {
  const step = sizeM / (LOCAL_N - 1);
  for (let row = rows[0]; row < rows[1]; row++) {
    for (let col = 0; col < LOCAL_N; col++) {
      const at: [number, number] = [-sizeM / 2 + col * step,
        sizeM / 2 - row * step];
      ys[row * LOCAL_N + col] =
        surfaceY(source.store, source.frame, source.reach, at);
    }
  }
}
