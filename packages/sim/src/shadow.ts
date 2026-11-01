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
 * The Sun at a site NASA's maps put in permanent shadow (VENT-39): the
 * smooth horizon of `sky.ts` and JPL Horizons both see the Sun rise over
 * a crater floor that the crater's own walls keep dark, so for such a site
 * the Sun answer follows the map, never up. The Earth is left as computed.
 * Pure.
 */
import type { HourSample, SiteShadow } from './site.ts';

/** Whether NASA's maps say the Sun never reaches the site. */
export function inPermanentShadow(shadow: SiteShadow | undefined): boolean {
  return shadow?.kind === 'psr';
}

/**
 * The site's hours with the Sun hidden in every one when the site is in
 * permanent shadow (`sunHidden`, which `hasSun` honours); the same array
 * otherwise. Used on the computed hours and on Horizons' alike.
 */
export function shadowedHours(
  hours: readonly HourSample[],
  shadow: SiteShadow | undefined,
): readonly HourSample[] {
  if (!inPermanentShadow(shadow)) return hours;
  return hours.map((hour) => ({ ...hour, sunHidden: true }));
}
