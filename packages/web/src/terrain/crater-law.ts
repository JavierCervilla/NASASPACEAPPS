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
 * The small craters of the near ground (VENT-64): how many there are and
 * how deep. Pure; crater-profile.ts draws them and crater-relief.ts piles
 * them in a raster.
 *
 * Count: the empirical equilibrium of Trask (1966, JPL TR 32-800, Ranger
 * VII-IX mare counts), cumulative N(>D) = 10^10.9 D^-2 per 10^6 km² with D
 * in metres, i.e. {@link TRASK_PER_M2} D^-2 per m². The exponent is
 * unreadable in the NTRS scan and the figures bound it to 10.9 ± 0.4; the
 * lower bound of Minton et al. (2019, arXiv:1902.07746) at Apollo 15 is
 * 0.0336, so the count is the high side (ASSETS.md).
 *
 * Depth: Pike (1977, Impact and Explosion Cratering, p. 492) gives fresh
 * simple craters d/D 0.2 with a raised rim. They degrade by the classes of
 * Basilevsky (1976, LPSC 7, Table 1 and p. 1006) with the share of the
 * small craters in each; the d/D range of a class is the one that
 * paper gives it.
 */
import { generator } from './seeded';

/** Trask's equilibrium: N(>D) = TRASK_PER_M2 / D² craters per m². */
export const TRASK_PER_M2 = 0.0794;

export interface DegradationClass {
  readonly name: string;
  /** Share of the craters, 0 to 1; the shares add to 1. */
  readonly share: number;
  /** Depth over diameter, least and most. */
  readonly dd: readonly [number, number];
}

/** Basilevsky (1976): freshest first. */
export const DEGRADATION: readonly DegradationClass[] = [
  { name: 'A', share: 0.005, dd: [0.2, 0.25] },
  { name: 'AB', share: 0.025, dd: [0.143, 0.2] },
  { name: 'B', share: 0.17, dd: [0.1, 0.143] },
  { name: 'BC', share: 0.3, dd: [0.083, 0.1] },
  { name: 'C', share: 0.5, dd: [0.03, 0.083] },
];

/** The d/D of a crater whose class falls at `u` and spread at `v`, 0 to 1. */
export function depthRatio(u: number, v: number): number {
  let from = 0;
  for (const c of DEGRADATION) {
    from += c.share;
    if (u < from) return c.dd[0] + (c.dd[1] - c.dd[0]) * v;
  }
  const last = DEGRADATION[DEGRADATION.length - 1]!;
  return last.dd[0] + (last.dd[1] - last.dd[0]) * v;
}

export interface Crater {
  /** Centre, in texels of the raster. */
  readonly x: number;
  readonly y: number;
  /** Diameter, in texels. */
  readonly diameter: number;
  /** Depth over diameter. */
  readonly dd: number;
}

export interface CraterField {
  /** Texels along the side of the square raster. */
  readonly texels: number;
  /** Smallest and largest diameter, texels. */
  readonly dMin: number;
  readonly dMax: number;
}

/** How many craters Trask's law puts in `field` (per texel², scale free). */
export function craterCount(field: CraterField): number {
  const { texels, dMin, dMax } = field;
  return Math.round(TRASK_PER_M2 * texels * texels
    * (1 / (dMin * dMin) - 1 / (dMax * dMax)));
}

/** The craters of `seed` in `field`: sizes by the law, places at random. */
export function seededCraters(seed: number, field: CraterField): Crater[] {
  const next = generator(seed ^ 0x2c1b3c6d);
  const { texels, dMin, dMax } = field;
  const ratio = (dMin * dMin) / (dMax * dMax);
  const out: Crater[] = [];
  for (let k = craterCount(field); k > 0; k--) {
    const diameter = dMin / Math.sqrt(1 - next() * (1 - ratio));
    out.push({ x: next() * texels, y: next() * texels, diameter,
      dd: depthRatio(next(), next()) });
  }
  return out;
}
