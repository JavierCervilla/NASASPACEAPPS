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
 * How much of the Sun's disc stands above the terrain (VENT-40). The app's
 * rule reads the Sun's centre; at a grazing Sun the relief may cover part
 * of the disc, and a lander's power is then a fraction. Pure.
 */
import { horizonAt, type HorizonProfile } from './terrain-profile.ts';

const DEG = Math.PI / 180;

/**
 * The Sun's mean angular radius seen from the Moon, degrees: the IAU 2015
 * nominal solar radius (695 700 km, Resolution B3) at one astronomical unit
 * (149 597 870.7 km, IAU 2012 Resolution B2), asin(R / au) = 0.26645°. Ours
 * to take the mean distance: over a year the radius varies by about 1.7 %.
 */
export const SUN_RADIUS_DEG = Math.asin(695_700 / 149_597_870.7) / DEG;

/**
 * Vertical strips the disc is cut into (our choice): with 16, a disc half
 * hidden behind a straight horizon reads 0.5 to within 0.01.
 */
const STRIPS = 16;

/** Of one vertical strip of the disc, the length above the terrain. */
function stripAbove(
  centreEl: number,
  halfChord: number,
  terrainEl: number,
): number {
  const bottom = Math.max(terrainEl, centreEl - halfChord);
  const top = centreEl + halfChord;
  return Math.min(Math.max(top - bottom, 0), 2 * halfChord);
}

/**
 * The fraction (0-1) of the Sun's disc above the terrain, for the Sun's
 * centre at azimuth `azDeg` and elevation `elDeg`. The disc is cut into
 * vertical strips, each against the terrain at its own azimuth (an offset
 * on the sky divided by cos(elevation)).
 */
export function sunDiscVisible(
  profile: HorizonProfile,
  azDeg: number,
  elDeg: number,
): number {
  const r = SUN_RADIUS_DEG;
  const stretch = 1 / Math.max(Math.cos(elDeg * DEG), 0.01);
  let above = 0;
  let total = 0;
  for (let j = 0; j < STRIPS; j++) {
    const x = r * (-1 + (2 * j + 1) / STRIPS);
    const half = Math.sqrt(r * r - x * x);
    const terrain = horizonAt(profile, azDeg + x * stretch);
    above += stripAbove(elDeg, half, terrain);
    total += 2 * half;
  }
  return above / total;
}
