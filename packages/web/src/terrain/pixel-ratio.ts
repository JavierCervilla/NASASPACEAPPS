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
 * The on-foot view's pixel ratio (VENT-73): a phone at the medium tier draws
 * at 1.25 at most. The Pixel 10 lost its GPU after seconds of turning at
 * 719 x 1417 and a ratio of 1.75 (about 1.96 times the pixels of 1.25), so
 * the cap trades sharpness for GPU time there; a desktop and the globe keep
 * the tier's own cap.
 */
import type { QualitySettings } from '../lib/quality';

/** The most a phone draws at in the medium tier. */
export const PHONE_MEDIUM_PIXEL_RATIO = 1.25;

/** The ratio the canvas draws at, given the device's own. */
export function terrainPixelRatio(
  quality: QualitySettings,
  phone: boolean,
  devicePixelRatio: number,
): number {
  const phoneCap = phone && quality.tier === 'medium'
    ? PHONE_MEDIUM_PIXEL_RATIO : Infinity;
  return Math.min(devicePixelRatio, quality.maxPixelRatio, phoneCap);
}
