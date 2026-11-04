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
 * The regolith's clods (VENT-67): how many there are, how big, and where.
 * Pure. In Apollo 12's AS12-49-7284 the ground at the feet is lumpy, clods of
 * millimetres to centimetres with a nearly black shadow of their own.
 * No published size law was found for undisturbed regolith clods (the Apollo
 * grain-size curves are for sieved soil), so this one is OUR CALIBRATION:
 * a cumulative N(>d) = C d^-2.2 per m² from 3 to 30 mm, heights 0.15 to 0.4
 * of the diameter, with C set so that under a Sun at 16.5° (that frame's)
 * about 20 % of the ground seen from above lies in clod shadow, where the
 * photo has 12 to 27 % darker than 35/255 (ASSETS.md). Density follows a
 * slow noise, so patches of smooth dust alternate with clusters of clods
 * as in the photograph.
 */
import { generator } from './seeded';

export const CLOD_TEXELS = 1024;
/** Metres one repeat of the raster covers, and one texel. */
export const CLOD_TILE_M = 0.8;
export const CLOD_TEXEL_M = CLOD_TILE_M / CLOD_TEXELS;

export const CLOD_LAW = {
  /** Smallest and largest clod, metres. */
  dMin: 0.003,
  dMax: 0.03,
  /** The cumulative exponent: N(>d) ~ d^-b. */
  b: 2.2,
  /** Share of the ground the clods cover, on average. */
  cover: 0.15,
  /** Height over diameter: least, and the span above it. */
  hLo: 0.15,
  hSpan: 0.25,
  /** The slow noise: cells across a repeat, and how dusty its lows are. */
  noiseCells: 8,
  dustyShare: 0.12,
} as const;

export interface Lump {
  /** Centre and radius, in texels; height, metres. */
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly top: number;
  /** The outline's second and third harmonics: amplitude and phase. */
  readonly a2: number;
  readonly p2: number;
  readonly a3: number;
  readonly p3: number;
}

/** C of the law for the cover: cover = C b π/4 ∫ d^(1-b) dd. */
export function lawC(): number {
  const { dMin, dMax, b, cover } = CLOD_LAW;
  const integral = (dMax ** (2 - b) - dMin ** (2 - b)) / (2 - b);
  return cover / ((b * Math.PI) / 4 * integral);
}

/** A wrapped value noise of the law's cells, 0 to 1 at texel (x, y). */
export function densityNoise(grid: Float32Array, x: number, y: number): number {
  const n = CLOD_LAW.noiseCells;
  const [u, v] = [(x / CLOD_TEXELS) * n, (y / CLOD_TEXELS) * n];
  const [x0, y0] = [Math.floor(u), Math.floor(v)];
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const [fx, fy] = [smooth(u - x0), smooth(v - y0)];
  const at = (i: number, j: number): number => grid[(j % n) * n + (i % n)] ?? 0;
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const low = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + low * fy;
}

/**
 * The lumps of `seed`, largest first so the small ones sit on them. Each
 * candidate is kept with the noise's density, and the count raised to keep
 * the mean cover.
 */
export function clodLumps(seed: number, grid: Float32Array): Lump[] {
  const next = generator(seed ^ 0x1f83d9ab);
  const { dMin, dMax, b, hLo, hSpan } = CLOD_LAW;
  const [lo, hi] = [dMin ** -b, dMax ** -b];
  const wanted = lawC() * (lo - hi) * CLOD_TILE_M * CLOD_TILE_M;
  const meanKeep = grid.reduce((a, g) => a + keep(g), 0) / grid.length;
  const out: Lump[] = [];
  for (let k = Math.round(wanted / meanKeep); k > 0; k--) {
    const d = (lo - next() * (lo - hi)) ** (-1 / b);
    const [x, y] = [next() * CLOD_TEXELS, next() * CLOD_TEXELS];
    const rest = [next(), next(), next(), next(), next()];
    if (next() > keep(densityNoise(grid, x, y))) continue;
    out.push({ x, y, r: d / 2 / CLOD_TEXEL_M, top: d * (hLo + hSpan * rest[0]!),
      a2: 0.25 * rest[1]!, p2: rest[2]! * 6.283, a3: 0.15 * rest[3]!,
      p3: rest[4]! * 6.283 });
  }
  return out.sort((p, q) => q.r - p.r);
}

/** The chance a candidate stays where the noise is `g`: dusty lows keep few. */
export function keep(g: number): number {
  const t = Math.min(1, Math.max(0, (g - 0.25) / 0.4));
  return CLOD_LAW.dustyShare + (1 - CLOD_LAW.dustyShare) * t * t * (3 - 2 * t);
}

/** The noise grid of `seed`: values 0 to 1, `noiseCells` squared. */
export function noiseGrid(seed: number): Float32Array {
  const next = generator(seed ^ 0x3c6ef372);
  const n = CLOD_LAW.noiseCells;
  return Float32Array.from({ length: n * n }, () => next());
}
