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
 * Visibility rules of the spec («Ventana Lunar · Especificación y roadmap»,
 * restated in the scope of the VENT-3 plan): Sun > 0°, Earth > 3°, window =
 * both at once, DSN antenna = the complex that sees the Moon highest above 10°.
 */
import type { DsnComplex, HourSample } from './site.ts';

/**
 * The Sun powers the lander when its elevation is above this, in degrees (spec:
 * Sun > 0°).
 */
export const SUN_MIN_ELEVATION_DEG = 0;

/**
 * The lander can talk to Earth when the Earth's elevation is above this, in
 * degrees (spec: Earth > 3°).
 */
export const EARTH_MIN_ELEVATION_DEG = 3;

/**
 * A DSN complex can track the Moon only above this elevation, in degrees (spec:
 * DSN antenna above 10°).
 */
export const DSN_MIN_ELEVATION_DEG = 10;

/**
 * Whether the Sun is up at a sample: never where the terrain hides it
 * (`sunHidden`, permanent shadow); where the hour was read against the
 * terrain (`sunAboveTerrain`), its centre over the relief; else over 0°.
 */
export function hasSun(
  sample: Pick<HourSample, 'sunEl' | 'sunHidden' | 'sunAboveTerrain'>,
): boolean {
  if (sample.sunHidden === true) return false;
  return sample.sunAboveTerrain ?? sample.sunEl > SUN_MIN_ELEVATION_DEG;
}

/**
 * Whether the Earth is high enough for communication at a sample, and not
 * behind the terrain when the hour was read against it.
 */
export function hasEarth(
  sample: Pick<HourSample, 'earthEl' | 'earthAboveTerrain'>,
): boolean {
  return earthLink(sample.earthEl, sample.earthAboveTerrain) === 'link';
}

/** Whether a sample is a landing window: Sun and Earth at once. */
export function isWindow(
  sample: Pick<
    HourSample,
    'sunEl' | 'sunHidden' | 'sunAboveTerrain' | 'earthEl' | 'earthAboveTerrain'
  >,
): boolean {
  return hasSun(sample) && hasEarth(sample);
}

/**
 * The DSN complex listening to the Moon: the one that sees it highest, when
 * that is above {@link DSN_MIN_ELEVATION_DEG}; `null` when none does. Ties go
 * to the first complex in `moonElevations` order.
 */
export function activeDsn(
  moonElevations: Readonly<Partial<Record<DsnComplex, number>>>,
): DsnComplex | null {
  let best: DsnComplex | null = null;
  let bestEl = DSN_MIN_ELEVATION_DEG;
  const entries = Object.entries(moonElevations) as [DsnComplex, number][];
  for (const [complex, el] of entries) {
    if (el > bestEl) {
      best = complex;
      bestEl = el;
    }
  }
  return best;
}

/**
 * Whether a lander can talk to the Earth at an Earth elevation in degrees:
 * `link` above {@link EARTH_MIN_ELEVATION_DEG}; without it, `low` when the
 * Earth is up but under that, `below` when it is under the horizon.
 */
export type EarthLink = 'link' | 'low' | 'below';

/**
 * The {@link EarthLink} at an Earth elevation, degrees; `below` whatever
 * the elevation when the terrain hides the Earth (`aboveTerrain` false).
 */
export function earthLink(
  earthElDeg: number,
  aboveTerrain?: boolean,
): EarthLink {
  if (aboveTerrain === false) return 'below';
  if (earthElDeg > EARTH_MIN_ELEVATION_DEG) return 'link';
  return earthElDeg > 0 ? 'low' : 'below';
}
