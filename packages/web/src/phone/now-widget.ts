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

/** The «Right now» widget: which of the four states holds this hour. */
import { hasEarth, hasSun, type HourSample } from '@ventana/sim';
import { formatShare } from './format';
import type { NowState, NowWidget } from './widget-types';

/** What each state is called on the widget and the calendar. */
export const NOW_TITLES: Readonly<Record<NowState, string>> = {
  window: 'Landing window',
  sun: 'Sun only',
  earth: 'Earth only',
  none: 'No window',
};

/** The state of one hour: Sun and Earth, one of them, or neither. */
export function nowState(
  sample: Pick<HourSample, 'sunEl' | 'earthEl'>,
): NowState {
  const sun = hasSun(sample);
  const earth = hasEarth(sample);
  if (sun && earth) return 'window';
  if (sun) return 'sun';
  return earth ? 'earth' : 'none';
}

/** The widget for `sample`, with the month's window share. */
export function nowWidget(
  sample: Pick<HourSample, 'sunEl' | 'earthEl'>,
  windowPct: number,
  month: string,
): NowWidget {
  const state = nowState(sample);
  const detail = formatShare(windowPct, month);
  return { state, title: NOW_TITLES[state], detail };
}
