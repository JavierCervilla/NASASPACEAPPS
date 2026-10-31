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
 * What the screen reader hears of the astronaut (VENT-10), through a
 * polite live region: where it is and the state there, as the arrow keys
 * move it, and where it was dropped. Pure.
 */
import { formatCoords } from '../i18n/format';
import type { I18n } from '../i18n/translate';
import type { LatLon } from '../lib/polar-projection';
import type { NowState } from '../phone/widget-types';
import type { CarryView } from './carry-view';

/** «85.87° S, 61.34° E» and «Earth» for a point and its state. */
function placeWords(i18n: I18n, point: LatLon, state: NowState) {
  return {
    coords: formatCoords(i18n, point.lat, point.lonEast),
    state: i18n.t(`state.line.${state}`),
  };
}

/** Where the carried astronaut is: «85.87° S, 61.34° E: Earth». */
export function describeCarry(
  i18n: I18n,
  view: CarryView,
  pickedUp = false,
): string {
  if (!view.point || !view.state) return i18n.t('astro.readout.off');
  const words = placeWords(i18n, view.point, view.state);
  return i18n.t(pickedUp ? 'astro.say.pickedUp' : 'astro.say.at', words);
}

/** «Astronaut dropped at 85.87° S, 61.34° E: Earth.» */
export function describeDrop(
  i18n: I18n,
  point: LatLon,
  state: NowState,
): string {
  return i18n.t('astro.say.dropped', placeWords(i18n, point, state));
}
