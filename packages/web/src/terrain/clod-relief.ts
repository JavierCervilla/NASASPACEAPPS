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
 * The clod height field (VENT-67), baked in the browser in slicer jobs: one
 * wrapped raster of 1024 texels over 0.8 m (0.78 mm a texel) of rounded,
 * irregular lumps (half-ellipsoids with a wobbly outline, piled by a max)
 * over a matrix of shallow pits and sub-millimetre noise. The ground shader
 * reads it at two scales, turned, so it does not repeat. Heights in metres.
 */
import {
  CLOD_TEXELS,
  clodLumps,
  noiseGrid,
  type Lump,
} from './clod-law';
import { chunkByCost, pitsOf, stampPit, wrap } from './clod-jobs';
import { packClods } from './clod-pack';
import { generator } from './seeded';

/** Rows of the matrix or the packing per job. */
const ROWS_PER_JOB = 32;
/** The matrix noise, metres either side, and its cells across the tile. */
const MATRIX_M = 0.0004;
const MATRIX_CELLS = 256;

export function stampLump(h: Float32Array, c: Lump): void {
  const reach = Math.ceil(c.r * 1.45);
  const [cx, cy] = [Math.floor(c.x), Math.floor(c.y)];
  const base = Math.max(0, h[wrap(cy) * CLOD_TEXELS + wrap(cx)] ?? 0) * 0.6;
  for (let j = -reach; j <= reach; j++) {
    const row = wrap(cy + j) * CLOD_TEXELS;
    for (let i = -reach; i <= reach; i++) {
      const [dx, dy] = [cx + i + 0.5 - c.x, cy + j + 0.5 - c.y];
      const th = Math.atan2(dy, dx);
      const rr = c.r * (1 + c.a2 * Math.cos(2 * th + c.p2)
        + c.a3 * Math.cos(3 * th + c.p3));
      const t = Math.hypot(dx, dy) / rr;
      if (t >= 1) continue;
      const v = base + c.top * Math.sqrt(1 - t * t);
      if (v > (h[row + wrap(cx + i)] ?? 0)) h[row + wrap(cx + i)] = v;
    }
  }
}

/** Sub-millimetre matrix noise over `rows`, wrapped. */
export function addMatrix(
  h: Float32Array,
  seed: number,
  rows: readonly [number, number],
): void {
  const next = generator(seed ^ 0x6c62272e);
  const P = MATRIX_CELLS;
  const g = Float32Array.from({ length: P * P }, () => next() - 0.5);
  const at = (x: number, y: number): number =>
    g[(((y % P) + P) % P) * P + (((x % P) + P) % P)] ?? 0;
  const s = CLOD_TEXELS / P;
  for (let y = rows[0]; y < rows[1]; y++) {
    for (let x = 0; x < CLOD_TEXELS; x++) {
      const [u, v] = [x / s, y / s];
      const [x0, y0] = [Math.floor(u), Math.floor(v)];
      const [fx, fy] = [u - x0, v - y0];
      const n = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy)
        + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
      h[y * CLOD_TEXELS + x] = (h[y * CLOD_TEXELS + x] ?? 0) + MATRIX_M * n;
    }
  }
}

/** The bake as jobs of a few ms; the last leaves the packed RGBA in `out`. */
export function bakeClods(seed: number): {
  h: Float32Array;
  out: Uint8Array;
  jobs: (() => void)[];
  lumps: number;
} {
  const h = new Float32Array(CLOD_TEXELS * CLOD_TEXELS);
  const out = new Uint8Array(CLOD_TEXELS * CLOD_TEXELS * 4);
  const lumps = clodLumps(seed, noiseGrid(seed));
  const jobs: (() => void)[] = [];
  const area = (reach: number): number => (2 * Math.ceil(reach) + 1) ** 2;
  for (const run of chunkByCost(pitsOf(seed), (p) => area(p.r))) {
    jobs.push(() => run.forEach((p) => stampPit(h, p)));
  }
  for (const run of chunkByCost(lumps, (c) => area(c.r * 1.45))) {
    jobs.push(() => run.forEach((c) => stampLump(h, c)));
  }
  for (let y = 0; y < CLOD_TEXELS; y += ROWS_PER_JOB) {
    jobs.push(() => addMatrix(h, seed, [y, y + ROWS_PER_JOB]));
  }
  for (let y = 0; y < CLOD_TEXELS; y += ROWS_PER_JOB) {
    jobs.push(() => packClods(h, out, [y, y + ROWS_PER_JOB]));
  }
  return { h, out, jobs, lumps: lumps.length };
}
