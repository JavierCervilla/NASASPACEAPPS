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
 * What the compass button says to a screen reader (VENT-50): where the Earth
 * lies and what a press does, in the visitor's language. The place is one of
 * eight directions on the screen, or «at the centre» when the Earth is
 * nearly over the Moon's middle. Pure.
 */
import { sectorOf, type EarthMark, type Sector } from '../../globe/earth-mark';
import type { TextKey } from '../../i18n/catalogue';
import type { I18n } from '../../i18n/translate';

/** Nearer than this (radii) to the Moon's centre, the Earth is «centred». */
export const CENTRE_OFFSET = 0.12;

const WHERE: Readonly<Record<Sector, TextKey>> = {
  top: 'compass.where.top',
  topRight: 'compass.where.topRight',
  right: 'compass.where.right',
  bottomRight: 'compass.where.bottomRight',
  bottom: 'compass.where.bottom',
  bottomLeft: 'compass.where.bottomLeft',
  left: 'compass.where.left',
  topLeft: 'compass.where.topLeft',
};

const centred = (mark: EarthMark): boolean =>
  !mark.far && mark.offset < CENTRE_OFFSET;

/** The key of the sentence that places the Earth, and its direction. */
function placing(mark: EarthMark): TextKey {
  if (mark.far) return 'compass.earth.far';
  return centred(mark) ? 'compass.earth.centre' : 'compass.earth.near';
}

/** The button's accessible name for `mark`. */
export function compassName(i18n: I18n, mark: EarthMark): string {
  const where = i18n.t(WHERE[sectorOf(mark.angleDeg)]);
  return `${i18n.t(placing(mark), { where })} ${i18n.t('compass.press')}`;
}

/** Whether two marks are named alike: the same side and the same place. */
export function samePlace(a: EarthMark, b: EarthMark): boolean {
  if (a.far !== b.far || centred(a) !== centred(b)) return false;
  return centred(a) || sectorOf(a.angleDeg) === sectorOf(b.angleDeg);
}
