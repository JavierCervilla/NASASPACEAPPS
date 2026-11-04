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
 * Splitting the clod bake into slicer jobs of about the same cost (VENT-67):
 * a job is under 20 ms, and the lumps and pits differ by 100 times in the
 * texels they stamp, so a fixed count per job would not hold it.
 */
import { CLOD_TEXELS, CLOD_TEXEL_M, CLOD_TILE_M } from './clod-law';
import { generator } from './seeded';

/** Texels stamped by one job (a few ms). */
export const TEXELS_PER_JOB = 40_000;
/** Pits per m²: shallow cups of 2 to 15 mm in the matrix. */
const PITS_PER_M2 = 900;
/** No pit is deeper than this, which the packed range holds with the noise. */
const MAX_PIT_M = 0.005;

export interface Pit {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly depth: number;
}

/** A raster index wrapped onto the tile. */
export function wrap(v: number): number {
  return ((v % CLOD_TEXELS) + CLOD_TEXELS) % CLOD_TEXELS;
}

/** The pits of `seed`: centre and radius in texels, depth in metres. */
export function pitsOf(seed: number): Pit[] {
  const next = generator(seed ^ 0x5be0cd19);
  const n = Math.round(CLOD_TILE_M * CLOD_TILE_M * PITS_PER_M2);
  return Array.from({ length: n }, () => {
    const r = (0.002 + 0.013 * next() ** 2) / CLOD_TEXEL_M;
    const [cx, cy] = [next() * CLOD_TEXELS, next() * CLOD_TEXELS];
    const depth = Math.min(r * CLOD_TEXEL_M * (0.25 + 0.3 * next()), MAX_PIT_M);
    return { cx, cy, r, depth };
  });
}

/** Cuts pit `p` in `h`, never raising what a lump holds. */
export function stampPit(h: Float32Array, p: Pit): void {
  const reach = Math.ceil(p.r);
  for (let j = -reach; j <= reach; j++) {
    for (let i = -reach; i <= reach; i++) {
      const t = Math.hypot(Math.floor(p.cx) + i + 0.5 - p.cx,
        Math.floor(p.cy) + j + 0.5 - p.cy) / p.r;
      if (t >= 1) continue;
      const at = wrap(Math.floor(p.cy) + j) * CLOD_TEXELS
        + wrap(Math.floor(p.cx) + i);
      h[at] = Math.min(h[at] ?? 0, -p.depth * (1 - t * t));
    }
  }
}

/** `items` in order, in runs whose `texels` add up to about `budget`. */
export function chunkByCost<T>(
  items: readonly T[],
  texels: (item: T) => number,
  budget = TEXELS_PER_JOB,
): T[][] {
  const runs: T[][] = [[]];
  let spent = 0;
  for (const item of items) {
    if (spent >= budget) {
      runs.push([]);
      spent = 0;
    }
    runs[runs.length - 1]?.push(item);
    spent += texels(item);
  }
  return runs;
}
