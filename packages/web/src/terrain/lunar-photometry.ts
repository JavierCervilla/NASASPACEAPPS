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
 * The ground's light, the Moon's way (VENT-62). Regolith is not Lambert: it
 * is dark, almost without specular, brightest looking away from the Sun
 * and, toward the Sun, dim and flat. Two terms, as the planetary-imaging
 * community uses them:
 *
 * - lunar-Lambert, McEwen (1991): r = 2 L(α) μ0 / (μ0 + μ) + (1 − L(α)) μ0,
 *   with L(α) = 1 − 0.019 α + 2.42e−4 α² − 1.46e−6 α³ (α in degrees). The
 *   coefficients are those of USGS ISIS `LunarLambertMcEwen.cpp` (public
 *   domain, A. McEwen 1995), checked against the source on 2026-11-03.
 *   ISIS divides by r to correct images; this is its forward model, and,
 *   like ISIS, it is normalised at i = 30°, e = 0°, α = 30° (R30). ISIS
 *   keeps L unclamped; the cubic is a fit to α ≤ 120° and goes negative
 *   beyond it, so it is held to L_FLOOR..1 here.
 * - a shadow-hiding opposition surge, B(α) = 1 + B0 / (1 + tan(α/2) / h)
 *   (Hapke's SHOE form), normalised at α = 30°. B0 and h are NOT taken
 *   from a verified lunar fit (Sato et al. 2014 and Hapke et al. 2012 were
 *   not read): they are calibrated on the Apollo Hasselblad frames
 *   (`APOLLO_HALO`), the only photographs of the real surface with the
 *   Sun low that this view can be held to.
 *
 * The GLSL in scene/ground-photometry.ts is the twin of this file: same
 * constants, built from them. Pure.
 */

const RAD = Math.PI / 180;

/** Opposition amplitude and angular width (tan of half the phase). */
export const SHOE = { b0: 0.4, h: 0.05 } as const;
/** The phase angle the model is normalised at, degrees. */
export const NORMAL_PHASE_DEG = 30;
/** The McEwen cubic's coefficients (ISIS LunarLambertMcEwen). */
export const MCEWEN = [-0.019, 0.000242, -0.00000146] as const;

/**
 * The halo around the antisolar point in the Apollo frames: the ground by
 * the camera's shadow over the ground of the same rows beside it, linear
 * luminance: AS12-46-6731 ×1.55, AS15-85-11446 ×1.64, AS17-136-20684 ×1.34
 * (calibration.md, VENT-62).
 */
export const APOLLO_HALO = { min: 1.34, max: 1.64 } as const;

/**
 * L's floor at high phase (α past the cubic's fit to 120°): not ISIS's, a
 * calibration on the Apollo frames. Looking toward the Sun the real ground
 * is 0.4 to 0.7 of the ground away from it (calibration.md, with the lens's
 * veil adding some light), where the cubic alone (L = 0, pure Lambert)
 * leaves it at a fifth. The ratio is measured on the drawn ground, fill
 * included (e2e/terrain-view).
 */
export const L_FLOOR = 0.3;

/** L(α), α in degrees, held to L_FLOOR..1. */
export function lunarL(alphaDeg: number): number {
  const [m1, m2, m3] = MCEWEN;
  const a = alphaDeg;
  return Math.min(Math.max(1 + m1 * a + m2 * a * a + m3 * a * a * a, L_FLOOR),
    1);
}

/** McEwen's lunar-Lambert r for the cosines `mu0` (Sun), `mu` (eye). */
function lunarLambert(mu0: number, mu: number, alphaDeg: number): number {
  if (mu0 <= 0) return 0;
  const l = lunarL(alphaDeg);
  return (2 * l * mu0) / (mu0 + mu + 1e-3) + (1 - l) * mu0;
}

const shoe = (alphaDeg: number): number =>
  1 + SHOE.b0 / (1 + Math.tan(Math.min(alphaDeg, 178) * RAD / 2) / SHOE.h);

/** The opposition surge at `alphaDeg`, 1 at {@link NORMAL_PHASE_DEG}. */
export const opposition = (alphaDeg: number): number =>
  shoe(alphaDeg) / shoe(NORMAL_PHASE_DEG);

const COS_NORMAL = Math.cos(NORMAL_PHASE_DEG * RAD);
/** r at i = 30°, e = 0°, α = 30°. */
const R30 = lunarLambert(COS_NORMAL, 1, NORMAL_PHASE_DEG);
/** Scales r so the normalising geometry reads as Lambert's cos i. */
export const LUNAR_NORM = COS_NORMAL / R30;

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
  return lunarLambert(mu0, mu, alphaDeg) * LUNAR_NORM * opposition(alphaDeg);
}
