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
 * The craters' height field (VENT-64): one wrapped raster of 1024 texels
 * holds craters of 6 to 48 texels by Trask's count (crater-law.ts) and is
 * read at two scales eight times apart, turned and offset so the two do
 * not line up. At 32 m a repeat the first scale carries 0.19 to 1.5 m
 * craters, at 256 m the second 1.5 to 12 m: together 0.19 to 12 m with no
 * gap and no double count, since a law without a scale looks the same at
 * both. Heights are in metres. Pure; the bake is cut in jobs for the slicer.
 */
import { seededCraters, type CraterField } from './crater-law';
import { stampCrater } from './crater-profile';

/** The raster, in texels a side, and the craters in it, in texels. */
export const CRATER_FIELD: CraterField = { texels: 1024, dMin: 6, dMax: 48 };

/** Metres one repeat of the raster covers at each scale. */
export const TILE_M = [32, 256] as const;

/** The two scales' turn (cos, sin) and offset, shared by CPU and GLSL. */
export const SCALES = [
  { m: TILE_M[0], c: Math.cos(0.7), s: Math.sin(0.7), offset: [0.19, 0.83] },
  { m: TILE_M[1], c: Math.cos(2.3), s: Math.sin(2.3), offset: [0.61, 0.27] },
] as const;

/** The smallest crater each scale carries, metres. */
const dMinOf = (m: number): number =>
  (CRATER_FIELD.dMin * m) / CRATER_FIELD.texels;
export const SCALE_D_MIN_M =
  [dMinOf(SCALES[0].m), dMinOf(SCALES[1].m)] as const;

/** Craters stamped per slicer job: a few milliseconds. */
const PER_JOB = 120;

/** Bilinear read of the wrapped raster at texel coordinates (u, v). */
export function readRelief(h: Float32Array, u: number, v: number): number {
  const n = CRATER_FIELD.texels;
  const [x0, y0] = [Math.floor(u - 0.5), Math.floor(v - 0.5)];
  const [fx, fy] = [u - 0.5 - x0, v - 0.5 - y0];
  const at = (x: number, y: number): number =>
    h[(((y % n) + n) % n) * n + (((x % n) + n) % n)] ?? 0;
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const low = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + low * fy;
}

/** Metres of relief of scale `k` at the ground point `x` east, `z` south. */
export function scaleAt(
  h: Float32Array,
  k: 0 | 1,
  x: number,
  z: number,
): number {
  const { m, c, s, offset } = SCALES[k];
  const n = CRATER_FIELD.texels;
  const u = ((c * x - s * z) / m + offset[0]) * n;
  const v = ((s * x + c * z) / m + offset[1]) * n;
  return readRelief(h, u, v) * (m / n);
}

/** Metres of crater relief at `x`, `z`, each scale times its weight. */
export function reliefAt(
  h: Float32Array,
  x: number,
  z: number,
  weights: readonly [number, number] = [1, 1],
): number {
  const [a, b] = weights;
  return (a > 0 ? a * scaleAt(h, 0, x, z) : 0)
    + (b > 0 ? b * scaleAt(h, 1, x, z) : 0);
}

/** The raster of `seed` and the jobs that stamp its craters into it. */
export function bakeRelief(seed: number): {
  field: Float32Array;
  jobs: (() => void)[];
  count: number;
} {
  const { texels } = CRATER_FIELD;
  const field = new Float32Array(texels * texels);
  const craters = seededCraters(seed, CRATER_FIELD);
  const jobs: (() => void)[] = [];
  for (let from = 0; from < craters.length; from += PER_JOB) {
    jobs.push(() => {
      for (const c of craters.slice(from, from + PER_JOB)) {
        stampCrater(field, texels, c);
      }
    });
  }
  return { field, jobs, count: craters.length };
}
