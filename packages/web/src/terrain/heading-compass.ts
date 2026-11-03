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

import { bodySentence, directionOf, octantOf } from '../horizon/horizon-alt';
import type { BodyAt } from '../horizon/strip-marks';
import type { I18n } from '../i18n/translate';

/** Where the compass draws its rose and its Earth, degrees clockwise. */
export interface HeadingMark {
  /** The rose's turn: north's place from the top of the button. */
  readonly roseDeg: number;
  /** The Earth's place on the ring; null before the sky is known. */
  readonly earth: { readonly angleDeg: number;
    readonly hidden: boolean } | null;
}

/** `azDeg` seen from a view heading `yawDeg`: clockwise, (-180, 180]. */
export function relativeAzimuth(azDeg: number, yawDeg: number): number {
  const turn = (((azDeg - yawDeg) % 360) + 360) % 360;
  return turn > 180 ? turn - 360 : turn;
}

/** The compass for a view heading `yawDeg`, with the `earth` it sees. */
export function headingMark(yawDeg: number, earth?: BodyAt): HeadingMark {
  return {
    roseDeg: relativeAzimuth(0, yawDeg),
    earth: earth ? { angleDeg: relativeAzimuth(earth.azDeg, yawDeg),
      hidden: !earth.visible } : null,
  };
}

/**
 * The button's accessible name: the heading's point of the compass, where
 * the Earth is and what a press does.
 */
export function headingCompassName(
  i18n: I18n,
  yawDeg: number,
  earth?: BodyAt,
): string {
  const dir = directionOf(i18n, octantOf(yawDeg) * 45);
  const lines = [i18n.t('onFoot.compass.heading', { dir })];
  if (earth) lines.push(bodySentence(i18n, earth, true));
  lines.push(i18n.t('onFoot.compass.press'));
  return lines.join(' ');
}
