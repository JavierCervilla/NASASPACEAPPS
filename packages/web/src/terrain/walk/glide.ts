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
 * The eye's glide to a place (VENT-121, apple-design): it slides from where
 * it stands to the target on a critically damped curve, over a time that
 * grows with the distance from {@link GLIDE_MIN_S} to {@link GLIDE_MAX_S}
 * (the square root of the share of the reach, so short hops stay brisk). A
 * new target mid-glide starts a new glide from where the eye is. Under
 * reduced motion there is no glide: the eye is there at once. Pure.
 */
import { REACH_M, type EastNorth } from './walk-reach';

export const GLIDE_MIN_S = 0.6;
export const GLIDE_MAX_S = 2;
/**
 * The curve's stiffness over the glide's time: a critically damped spring
 * `1 - (1 + kt) e^-kt`, normalised to land exactly at the end.
 */
const STIFFNESS = 7;
const AT_END = 1 - (1 + STIFFNESS) * Math.exp(-STIFFNESS);

export interface Glide {
  readonly from: EastNorth;
  readonly to: EastNorth;
  readonly durationS: number;
  /** Seconds run so far. */
  readonly elapsedS: number;
}

/** How long a glide of `distanceM` takes, seconds. */
export function glideDuration(distanceM: number): number {
  const share = Math.min(Math.max(distanceM / REACH_M, 0), 1);
  return GLIDE_MIN_S + (GLIDE_MAX_S - GLIDE_MIN_S) * Math.sqrt(share);
}

/** The share of the way covered at `t`, 0 to 1 of the glide's time. */
export function glideCurve(t: number): number {
  const u = Math.min(Math.max(t, 0), 1) * STIFFNESS;
  return (1 - (1 + u) * Math.exp(-u)) / AT_END;
}

/** A glide from `from` to `to`. */
export function startGlide(from: EastNorth, to: EastNorth): Glide {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return { from, to, durationS: glideDuration(d), elapsedS: 0 };
}

/** Where the eye is `dtS` seconds on, and the glide left (null: arrived). */
export function stepGlide(
  glide: Glide,
  dtS: number,
): { at: EastNorth; glide: Glide | null } {
  const elapsedS = glide.elapsedS + dtS;
  if (elapsedS >= glide.durationS) return { at: glide.to, glide: null };
  const k = glideCurve(elapsedS / glide.durationS);
  const { from, to } = glide;
  const at: EastNorth = [from[0] + (to[0] - from[0]) * k,
    from[1] + (to[1] - from[1]) * k];
  return { at, glide: { ...glide, elapsedS } };
}
