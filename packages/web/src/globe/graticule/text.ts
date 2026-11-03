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
 * The words the graticule's labels wear (VENT-50), written through the
 * interface's own angle format (i18n/format.ts), so a parallel reads «85° S»
 * and a western meridian «90° W», «90° O» in Spanish.
 */
import { formatAngle } from '../../i18n/format';
import type { I18n } from '../../i18n/translate';

export interface GraticuleText {
  /** The label of the parallel at `latDeg` (negative: south). */
  parallel(latDeg: number): string;
  /** The label of the meridian at `lonEastDeg`; 0 has no letter. */
  meridian(lonEastDeg: number): string;
}

/** The labels' words in the visitor's language. */
export function graticuleText(i18n: I18n): GraticuleText {
  return {
    parallel: (latDeg) => formatAngle(i18n, latDeg, 'lat', 0),
    meridian: (lonEastDeg) =>
      lonEastDeg === 0
        ? `${i18n.number(0)}°`
        : formatAngle(i18n, lonEastDeg, 'lon', 0),
  };
}
