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
 * What the walk says (VENT-121): where the eye stands from the point,
 * «180 m NE of IM-2» (metres in 10 m steps under 1 km, «1.2 km» from there,
 * the bearing on eight points of the compass), and the state there, «Window
 * here». Numbers through Intl, words through the catalogues. Pure.
 */
import type { TextKey } from '../../i18n/catalogue';
import type { I18n } from '../../i18n/translate';
import { octantOf } from '../../horizon/horizon-alt';
import type { NowState } from '../../phone/widget-types';
import type { EastNorth } from './walk-reach';

const POINTS: readonly TextKey[] = ['walk.dir.n', 'walk.dir.ne',
  'walk.dir.e', 'walk.dir.se', 'walk.dir.s', 'walk.dir.sw', 'walk.dir.w',
  'walk.dir.nw'];

const STATES: Readonly<Record<NowState, TextKey>> = {
  window: 'walk.here.window',
  sun: 'walk.here.sun',
  earth: 'walk.here.earth',
  none: 'walk.here.none',
};

/** The bearing of `at` from the point, degrees clockwise from north. */
export const bearingOf = (at: EastNorth): number =>
  ((Math.atan2(at[0], at[1]) * 180) / Math.PI + 360) % 360;

/** «180 m» in 10 m steps under 1 km, «1.2 km» from there. */
export function distanceText(i18n: I18n, metres: number): string {
  const tens = Math.round(metres / 10) * 10;
  if (tens < 1000) return i18n.t('walk.metres', { n: i18n.number(tens) });
  return i18n.t('walk.km', { n: i18n.number(metres / 1000, 1) });
}

/** «180 m NE of IM-2»: where `at` is from the point named `site`. */
export function whereText(i18n: I18n, at: EastNorth, site: string): string {
  const distance = distanceText(i18n, Math.hypot(at[0], at[1]));
  const dir = i18n.t(POINTS[octantOf(bearingOf(at))] ?? 'walk.dir.n');
  return i18n.t('walk.where', { distance, dir, site });
}

/** «Window here»: the state where the eye stands. */
export const hereText = (i18n: I18n, state: NowState): string =>
  i18n.t(STATES[state]);
