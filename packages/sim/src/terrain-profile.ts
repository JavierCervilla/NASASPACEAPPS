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
 * The terrain's horizon around a point (VENT-40): how high the relief stands
 * in each direction, as seen from an observer a little above the ground. The
 * smooth sphere of `sky.ts` puts the horizon at 0° everywhere; on the lunar
 * south pole the relief can hide a Sun 5° up or show one 2° down. Computed
 * from LOLA's elevation grids by `ray-march.ts`. Pure.
 */

/** Units of a stored elevation: hundredths of a degree. */
export const CENTIDEG_PER_DEG = 100;

const INT16_MIN = -32768;
const INT16_MAX = 32767;

/**
 * The terrain's elevation angle around a point, one value per azimuth bin.
 * Bin `i` of `n` is centred on azimuth `i * 360 / n` degrees, clockwise from
 * north; between two bin centres the horizon is read linearly. Values are in
 * hundredths of a degree ({@link CENTIDEG_PER_DEG}), above the observer's
 * local horizontal plane (negative: the ground falls away below it).
 */
export interface HorizonProfile {
  readonly centiDeg: Int16Array;
}

/** An angle in degrees as a stored value, rounded half up and clamped. */
export function quantiseDeg(deg: number): number {
  const units = Math.floor(deg * CENTIDEG_PER_DEG + 0.5);
  return Math.min(INT16_MAX, Math.max(INT16_MIN, units));
}

/** The terrain's elevation at azimuth `azDeg`, degrees, read linearly. */
export function horizonAt(profile: HorizonProfile, azDeg: number): number {
  const values = profile.centiDeg;
  const n = values.length;
  const pos = ((((azDeg / 360) * n) % n) + n) % n;
  const i = Math.floor(pos);
  const frac = pos - i;
  const a = values[i] ?? 0;
  const b = values[(i + 1) % n] ?? 0;
  return (a + (b - a) * frac) / CENTIDEG_PER_DEG;
}

/** Whether a direction is above the terrain's horizon at its azimuth. */
export function isAboveTerrain(
  profile: HorizonProfile,
  azDeg: number,
  elDeg: number,
): boolean {
  return elDeg > horizonAt(profile, azDeg);
}
