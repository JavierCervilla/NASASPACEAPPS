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
 * The law of the rocks (VENT-62, VENT-68), after Golombek & Rapp (1997, JGR
 * 102, 4117), eq. 11 and 12 on p. 4126: the cumulative fractional area
 * F_k(D) = k exp(-q(k) D) with q(k) = 1.79 + 0.152 / k, read in the paper
 * and verified. Bandfield et al. (2011, JGR 116, E00H02) apply it to the
 * Moon; see rocks-measured.ts, whose constants these are. The plains' k
 * (0.004) is ours from Diviner's median of 0.003 (ASSETS.md), the rise with
 * slope and the 0.05 maximum are calibrations. Pure.
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
  /**
   * Below this k the exponent q stops growing (see {@link qOf}); 0: it never
   * does, as the first cut had it.
   */
  readonly kFitMin: number;
  /** Diameter step of the integration, and bands of this many steps. */
  readonly stepD: number;
  readonly bandSteps: number;
  /** The share of a rock buried, least and most. */
  readonly buried: readonly [number, number];
}

export const MEASURED: MeasuredScatter = { innerM: 2.5, outerM: 120,
  rangePerD: 260, minD: 0.05, maxD: 0.9, kFlat: 0.004, kMax: 0.05, cap: 520,
  kFitMin: 0.02, stepD: 0.01, bandSteps: 3, buried: [0.2, 0.5] };

/**
 * The law before VENT-68, the medium and low tiers': the plains' k 0.01 and
 * a q that is never held. Their rocks stay as they were (ground-policy.ts).
 */
export const FIRST_CUT: MeasuredScatter = { ...MEASURED, kFlat: 0.01,
  kFitMin: 0 };

/** The smallest k Golombek & Rapp fitted (their range is 0.02 to 0.3). */
export const K_FITTED_MIN = 0.02;

/**
 * Golombek & Rapp's exponent for k (eq. 12). Fitted to two Viking sites for
 * k from 0.02 to 0.3: below it the law is an EXTRAPOLATION, and the
 * exponent is held at q(0.02) = 9.39 so a lower k only lowers the cover
 * and does not shrink the rocks (the unclamped q is 39.8 at 0.004).
 */
export const qOf = (k: number, kFitMin: number = K_FITTED_MIN): number =>
  1.79 + 0.152 / Math.max(k, kFitMin);

/**
 * Rocks per m² per metre of diameter at `d` for `k`; `kFitMin` is the law's
 * ({@link MeasuredScatter.kFitMin}).
 */
export function density(
  k: number,
  d: number,
  kFitMin: number = K_FITTED_MIN,
): number {
  const q = qOf(k, kFitMin);
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
