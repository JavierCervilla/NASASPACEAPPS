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
 * What the site card shows for a month's hours at the selected instant:
 * its two countdowns and the month's figures once loaded, or why not (the
 * month loading, failing, or outside the data the API holds). The
 * countdowns are the phone widgets' own (`widgetsAt`), so the two never
 * disagree. Pure.
 */
import {
  EARTH_MIN_ELEVATION_DEG,
  SUN_MIN_ELEVATION_DEG,
} from '@ventana/sim';
import { monthLabel } from '../calendar/instant-format';
import type { I18n } from '../i18n/translate';
import type { BodyWidget } from '../phone/widget-types';
import { widgetsAt, type HoursResult } from '../phone/widgets-loader';
import { monthFacts, type FactRow } from './month-facts';

export type CardModel =
  | { readonly kind: 'loading' | 'error' | 'outside' }
  | {
      readonly kind: 'ready';
      readonly sun: BodyWidget;
      readonly earth: BodyWidget;
      readonly rows: readonly FactRow[];
      readonly source: string;
    };

/**
 * «November 2026 · JPL Horizons, 1 h step · Sun above 0°, Earth above
 * 3°»: the month counted, the data and the rules.
 */
export function sourceLine(i18n: I18n, atMs: number): string {
  return i18n.t('card.source', {
    month: monthLabel(i18n, atMs),
    sun: i18n.number(SUN_MIN_ELEVATION_DEG),
    earth: i18n.number(EARTH_MIN_ELEVATION_DEG),
  });
}

/** The card for the hour of `atMs`, from its month's `hours`. */
export function siteCard(
  hours: HoursResult,
  atMs: number,
  i18n: I18n,
): CardModel {
  const widgets = widgetsAt(hours, atMs, i18n);
  if (widgets.kind !== 'ready' || hours.kind !== 'ready') {
    return { kind: widgets.kind === 'ready' ? 'error' : widgets.kind };
  }
  const rows = monthFacts(hours.hours, atMs, i18n);
  if (!rows) return { kind: 'error' };
  const { sun, earth } = widgets.widgets;
  const source = sourceLine(i18n, atMs);
  return { kind: 'ready', sun, earth, rows, source };
}
