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
 * The craters' own shadows (VENT-64), per vertex: from a vertex a march
 * toward the Sun over the craters' relief, against the Sun's 0.53° disc,
 * which gives the crescent in a crater's Sun-side wall and a sharp edge a
 * few millimetres wide, with none of the acne a shadow map has at 1 to 7°.
 * The result times the near ground's own mask (sun-shade.ts) is the
 * patch's `lit`. Pure but for the buffer it writes.
 */
import type { BufferAttribute, BufferGeometry } from 'three';
import { craterAt, type Relief } from './crater-spec';

/** The Sun as the shader and the march see it: a unit direction, y up. */
export interface SunDir {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Tangent of the Sun's disc (0.53°), the penumbra's growth with distance. */
const DISC_TAN = 0.0093;
/** The penumbra's floor, metres: the march's own error. */
const PENUMBRA_FLOOR_M = 0.002;
/** First step of the march, metres, and its growth: 28 steps, 18 m. */
const STEPS = Array.from({ length: 28 }, (_, k) => 0.015 * 1.3 ** k);
/** The march stops this far, or where a rise of 3 m would clear. */
const REACH_M = 25;
const CLEARING_M = 3;
/** Vertices a job shades: a few milliseconds. */
const JOB_VERTICES = 1500;

/**
 * 1 lit, 0 in a crater's shadow at `x`, `z`: the relief along the Sun
 * against the Sun's slope, over the ground's `tilt` toward it (metres per
 * metre; the ground's own shadows are sun-shade.ts's). A Sun under the
 * horizon is marched as it is, so the patch and the rings agree down to
 * the dip they light to; straight overhead it casts none.
 */
export function craterLit(
  rel: Relief,
  at: { x: number; z: number; tilt: number },
  sun: SunDir,
): number {
  const hl = Math.hypot(sun.x, sun.z);
  if (hl < 1e-6) return 1;
  const [dx, dz, tanEl] = [sun.x / hl, sun.z / hl, sun.y / hl];
  const here = craterAt(rel, at.x, at.z);
  const reach = Math.min(REACH_M, CLEARING_M / Math.max(Math.abs(tanEl), 0.01));
  let worst = -1;
  for (const t of STEPS) {
    if (t > reach) break;
    const rise = craterAt(rel, at.x + dx * t, at.z + dz * t) - here
      + t * (at.tilt - tanEl);
    worst = Math.max(worst, rise / (t * DISC_TAN + PENUMBRA_FLOOR_M));
  }
  const s = Math.min(1, Math.max(0, worst + 0.5));
  return 1 - s * s * (3 - 2 * s);
}

/** The ground's tilt toward the Sun at a vertex of normal `n`. */
const tiltOf = (n: readonly [number, number, number], sun: SunDir): number =>
  -(n[0] * sun.x + n[2] * sun.z) / (Math.hypot(sun.x, sun.z) || 1)
  / Math.max(n[1], 1e-3);

/**
 * Jobs that write `geometry`'s `lit` for `sun`: `ringLit` (the near
 * ground's mask at east, north) times the craters' shadow.
 */
export function litJobs(
  geometry: BufferGeometry,
  rel: Relief,
  sun: SunDir,
  ringLit: (east: number, north: number) => number,
): (() => void)[] {
  const pos = geometry.getAttribute('position').array as Float32Array;
  const nor = geometry.getAttribute('normal').array as Float32Array;
  const attribute = geometry.getAttribute('lit') as BufferAttribute;
  const lit = attribute.array as Float32Array;
  const jobs: (() => void)[] = [];
  for (let from = 0; from < lit.length; from += JOB_VERTICES) {
    jobs.push(() => {
      for (let v = from; v < Math.min(lit.length, from + JOB_VERTICES); v++) {
        const [x, z] = [pos[v * 3] ?? 0, pos[v * 3 + 2] ?? 0];
        const n: [number, number, number] = [nor[v * 3] ?? 0,
          nor[v * 3 + 1] ?? 1, nor[v * 3 + 2] ?? 0];
        lit[v] = ringLit(x, -z)
          * craterLit(rel, { x, z, tilt: tiltOf(n, sun) }, sun);
      }
    });
  }
  jobs.push(() => { attribute.needsUpdate = true; });
  return jobs;
}
