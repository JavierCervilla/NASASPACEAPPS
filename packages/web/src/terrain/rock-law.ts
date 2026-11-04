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
 * The law of the rocks (VENT-62), after Golombek & Rapp (1997, JGR 102,
 * 4117) and Bandfield et al. (2011, JGR 116, E00H02): see
 * rocks-measured.ts, whose constants these are. UNVERIFIED: q's two
 * constants, the background k and the rise with slope were written from
 * memory of those papers, not read. Pure.
 */

export interface MeasuredScatter {
  /** None right under the eye; none past `outerM`, metres. */
  readonly innerM: number;
  readonly outerM: number;
  /** Metres of range per metre of diameter (the ~2 px limit). */
  readonly rangePerD: number;
  /** Diameters, metres. */
  readonly minD: number;
  readonly maxD: number;
  /** k on flat, mature ground, and at its most on slopes and rims. */
  readonly kFlat: number;
  readonly kMax: number;
  readonly cap: number;
  /** Diameter step of the integration, and bands of this many steps. */
  readonly stepD: number;
  readonly bandSteps: number;
  /** The share of a rock buried, least and most. */
  readonly buried: readonly [number, number];
}

export const MEASURED: MeasuredScatter = { innerM: 2.5, outerM: 120,
  rangePerD: 260, minD: 0.05, maxD: 0.9, kFlat: 0.01, kMax: 0.05, cap: 520,
  stepD: 0.01, bandSteps: 3, buried: [0.2, 0.5] };

/** Golombek & Rapp's exponent for k. */
export const qOf = (k: number): number => 1.79 + 0.152 / k;

/** Rocks per m² per metre of diameter at `d` for `k`. */
export function density(k: number, d: number): number {
  const q = qOf(k);
  return (k * q * Math.exp(-q * d)) / ((Math.PI * d * d) / 4);
}

export type Ground = (east: number, north: number) => number;
/** Spacing of the near grid the slope is read from, metres. */
const PROBE_M = 8;
/** Slope (rise over run) and convexity (1 / m) at which k is at its most. */
const STEEP = 0.35;
const CONVEX = 0.02;

/** k where the ground has slope and convexity, read from the near grid. */
export function kAt(
  ground: Ground,
  east: number,
  north: number,
  s: MeasuredScatter = MEASURED,
): number {
  const h = PROBE_M;
  const [he, hw, hn, hs] = [ground(east + h, north), ground(east - h, north),
    ground(east, north + h), ground(east, north - h)];
  const slope = Math.hypot(he - hw, hn - hs) / (2 * h);
  const curve = (he + hw + hn + hs - 4 * ground(east, north)) / (h * h);
  const rough = Math.min(1, Math.max(slope / STEEP, -curve / CONVEX, 0));
  return s.kFlat + (s.kMax - s.kFlat) * rough;
}
