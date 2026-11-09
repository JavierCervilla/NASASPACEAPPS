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

import type { Translate } from '../i18n/catalogue';
import type { Locale } from '../i18n/locales';
import { monthText, percentText } from './format';
import type { MonthBars, Run } from './month';

/** The month strip's words: its title, caption and text alternative. */
export interface MonthWords {
  readonly title: string;
  readonly caption: string;
  readonly alt: string;
}

/** The words of `bars` in one language. */
export function monthWords(
  bars: MonthBars,
  t: Translate,
  locale: Locale,
): MonthWords {
  const month = monthText(bars.monthStartMs, locale);
  const pct = (share: number) => percentText(share, locale);
  return {
    title: t('month.title', { month }),
    caption: t('month.caption', { share: pct(bars.windowShare) }),
    alt: t('month.alt', {
      month,
      sun: pct(shareOf(bars.sun)),
      earth: pct(shareOf(bars.earth)),
      window: pct(bars.windowShare),
    }),
  };
}

/** The share of the month the runs cover. */
export function shareOf(runs: readonly Run[]): number {
  return runs.reduce((sum, run) => sum + (run.to - run.from), 0);
}
