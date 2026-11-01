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
 * The hours of a site read against its terrain's horizon (VENT-40). The
 * elevations stay those of the smooth sphere (the simulator's or JPL
 * Horizons'); each hour gains whether the Sun's centre and the Earth's
 * stand above the relief at their azimuths, and how much of the Sun's disc
 * does, so `hasSun` and `hasEarth` follow the real horizon. Pure.
 */
import type { HourSample } from './site.ts';
import { sunDiscVisible } from './sun-disc.ts';
import { isAboveTerrain, type HorizonProfile } from './terrain-profile.ts';

/**
 * The hours with the terrain's answer marked (`sunAboveTerrain`,
 * `sunDisc`, `earthAboveTerrain`); the same array when there is no
 * profile. Used on the computed hours and on Horizons' alike.
 */
export function terrainHours(
  hours: readonly HourSample[],
  profile: HorizonProfile | undefined,
): readonly HourSample[] {
  if (!profile) return hours;
  return hours.map((hour) => ({
    ...hour,
    sunAboveTerrain: isAboveTerrain(profile, hour.sunAz, hour.sunEl),
    sunDisc: sunDiscVisible(profile, hour.sunAz, hour.sunEl),
    earthAboveTerrain: isAboveTerrain(profile, hour.earthAz, hour.earthEl),
  }));
}
