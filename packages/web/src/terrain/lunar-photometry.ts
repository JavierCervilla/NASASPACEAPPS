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
 * The ground's light, the Moon's way (VENT-62, VENT-68): the Sun's
 * reflectance factor of regolith, for the albedo to multiply. The model is
 * Hapke et al. (2012) eq. 12 with its Table 1 (hapke.ts), whose
 * Lommel-Seeliger form and opposition surge make the ground brightest
 * looking away from the Sun. It replaces VENT-62's McEwen lunar-Lambert
 * with a hand-calibrated surge: that model could not give the published
 * narrow peak and the Apollo halo together.
 *
 * Three things here are ours, not the paper's:
 * - the Sun is not a point: the phase angle is smoothed, α' = √(α² + s²),
 *   with s = {@link PEAK_SMOOTH_DEG}. The paper's data are smoothed at 0.5°
 *   and the Sun is 0.53° wide; with 0.5° the halo came out 1.50 to 1.71
 *   times, over the Apollo band at wide offsets, and with 1° (the scale the
 *   Apollo boxes average over) 1.44 to 1.64;
 * - the model is valid to about 120° of phase. Beyond it the ground toward
 *   the Sun would fall to 0.1 to 0.2 of the ground away from it, where the
 *   Apollo frames show 0.4 to 0.7 (with the lens's veil adding some light).
 *   From {@link FLOOR_FROM_DEG} a floor takes over, {@link FLOOR_GAIN} times a
 *   Lommel-Seeliger and Lambert mix: a camera and veil calibration to the
 *   photographs, not physics;
 * - it is normalised at i = 30°, e = 0°, α = 30°, where it reads as
 *   Lambert's cos i, so the albedo keeps the meaning it had.
 *
 * The GLSL in scene/ground-photometry.ts is the twin of this file: same
 * constants, built from them. Pure.
 */
import { hapkeFactor } from './hapke';

const RAD = Math.PI / 180;

/** The phase angle the model is normalised at, degrees. */
export const NORMAL_PHASE_DEG = 30;

/** The Sun's disc and the data's smoothing, in quadrature, degrees. */
export const PEAK_SMOOTH_DEG = 1;

/**
 * The halo around the antisolar point in the Apollo frames: the ground by
 * the camera's shadow over the ground of the same rows beside it, linear
 * luminance: AS12-46-6731 ×1.55, AS15-85-11446 ×1.64, AS17-136-20684 ×1.34
 * (calibration.md, VENT-62).
 */
export const APOLLO_HALO = { min: 1.34, max: 1.64 } as const;

/** Past this phase the Hapke model is out of its validity, degrees. */
export const FLOOR_FROM_DEG = 120;
/** The floor is blended in over this many degrees of phase. */
export const FLOOR_RAMP_DEG = 20;
/** Floor level, calibrated so the up-sun ground reads 0.4 to 0.7. */
export const FLOOR_GAIN = 1.15;
/** The floor's Lommel-Seeliger and Lambert shares. */
export const FLOOR_LS = 0.6;
export const FLOOR_LAMBERT = 0.7;

/** α smoothed by the Sun's disc, degrees. */
export const smoothedPhase = (alphaDeg: number): number =>
  Math.hypot(alphaDeg, PEAK_SMOOTH_DEG);

/** The calibrated floor of the ground toward the Sun. */
export function floorFactor(mu0: number, mu: number): number {
  if (mu0 <= 0) return 0;
  return FLOOR_GAIN * mu0 * (FLOOR_LAMBERT + FLOOR_LS / (mu0 + mu + 1e-3));
}

const COS_NORMAL = Math.cos(NORMAL_PHASE_DEG * RAD);
/** Hapke's factor at i = 30°, e = 0°, α = 30°. */
const H30 = hapkeFactor(COS_NORMAL, 1, smoothedPhase(NORMAL_PHASE_DEG));
/** Scales the factor so the normalising geometry reads as cos i. */
export const LUNAR_NORM = COS_NORMAL / H30;

/** 0 up to {@link FLOOR_FROM_DEG}, 1 a ramp later (smoothstep). */
export function floorWeight(alphaDeg: number): number {
  const t = Math.min(Math.max((alphaDeg - FLOOR_FROM_DEG) / FLOOR_RAMP_DEG,
    0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * The ground's reflectance factor for the Sun, relative to Lambert's cos i
 * at the normalising geometry: what multiplies the albedo and the Sun's
 * light. `mu0` and `mu` are the cosines of the Sun and the eye with the
 * normal, `alphaDeg` the phase angle.
 */
export function groundReflectance(
  mu0: number,
  mu: number,
  alphaDeg: number,
): number {
  const hapke = hapkeFactor(mu0, mu, smoothedPhase(alphaDeg)) * LUNAR_NORM;
  const floor = Math.max(hapke, floorFactor(mu0, mu));
  return hapke + (floor - hapke) * floorWeight(alphaDeg);
}
