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
 * Hapke et al. (2012), «Characterization of the lunar surface from
 * Lunar Reconnaissance Orbiter Camera observations and the Hapke model»,
 * JGR 117, E00H15 (VENT-68): the reduced reflectance of eq. 12 with the
 * lunar highlands' parameters of its Table 1 at 604 nm. Single-lobe
 * Henyey-Greenstein particle phase function (c = 1), no macroscopic
 * roughness (θ̄ = 0), a shadow-hiding and a coherent-backscatter opposition
 * effect. Pure; the GLSL twin is scene/ground-photometry.ts.
 *
 * r = (w/4) 1 / (μ0 + μ) {[1 + B_S(g)] p(g) + H(μ0) H(μ) − 1}
 *     × [1 + B_C(g)]
 *
 * Reflectance per unit incident irradiance, so the radiance factor is
 * μ0 r: the Lommel-Seeliger μ0 / (μ0 + μ) times the braces (the factor
 * w/4 is the albedo and lives in the material, not here).
 */

/** Table 1 at 604 nm (±10 %) and the two widths derived from it. */
export const HAPKE = {
  /** Single-scattering albedo. */
  w: 0.357,
  /** Henyey-Greenstein asymmetry, a backscattering lobe (c = 1). */
  b: 0.298,
  /** Shadow-hiding amplitude B_S0 and coherent-backscatter amplitude B_C0. */
  bS0: 0.358,
  bC0: 0.456,
  /**
   * Widths in tan(g/2). The paper publishes the half-width g_H = 4.68° of
   * the opposition surge, not h_S and h_C («not with any degree of
   * confidence»): DERIVED here from g_H with its eqs. 9 and 10, so not
   * the paper's numbers.
   */
  hS: 0.041,
  hC: 0.113,
} as const;

const RAD = Math.PI / 180;
/** Keeps H's logarithm finite for a grazing cosine. */
const MIN_X = 1e-4;

/** The diffuse reflectance r0 of eq. 14, from w. */
export const DIFFUSE_R0 = (1 - Math.sqrt(1 - HAPKE.w))
  / (1 + Math.sqrt(1 - HAPKE.w));

/** Hapke's H(x) of eq. 14 (the 2012 form, θ̄ = 0), x a cosine. */
export function hFunction(x: number): number {
  const r0 = DIFFUSE_R0;
  const u = Math.max(x, MIN_X);
  return 1 / (1 - HAPKE.w * u * (r0 + ((1 - 2 * r0 * u) / 2)
    * Math.log((1 + u) / u)));
}

/** The one-lobe Henyey-Greenstein p(g), large toward g = 0. */
export function phaseFunction(gDeg: number): number {
  const { b } = HAPKE;
  return (1 - b * b) / (1 + b * b - 2 * b * Math.cos(gDeg * RAD)) ** 1.5;
}

/** B_S(g) and B_C(g) with their amplitudes, g in degrees. */
export function oppositionTerms(gDeg: number): { bs: number; bc: number } {
  const t = Math.tan(Math.min(gDeg, 178) * RAD / 2);
  const z = t / HAPKE.hC;
  const tail = (1 + (1 - Math.exp(-z)) / z) / 2 / (1 + z) ** 2;
  const coherent = z < 1e-6 ? 1 : tail;
  return { bs: HAPKE.bS0 / (1 + t / HAPKE.hS), bc: HAPKE.bC0 * coherent };
}

/**
 * Eq. 12's radiance factor μ0 r without the albedo's w/4, for the cosines
 * `mu0` (Sun) and `mu` (eye) and the phase `gDeg`. Zero under the horizon.
 */
export function hapkeFactor(mu0: number, mu: number, gDeg: number): number {
  if (mu0 <= 0) return 0;
  const { bs, bc } = oppositionTerms(gDeg);
  const scatter = (1 + bs) * phaseFunction(gDeg)
    + hFunction(mu0) * hFunction(mu) - 1;
  return (mu0 / (mu0 + mu + 1e-3)) * scatter * (1 + bc);
}
