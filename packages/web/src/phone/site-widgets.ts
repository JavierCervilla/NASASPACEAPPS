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
 * The four phone widgets of a site, from the hourly samples of its
 * {@link WidgetRange}. «Right now» and the countdowns read the rolling
 * horizon; the month's window share (`computeRangeMetrics` in
 * `@ventana/sim`) reads the calendar month only.
 */
import {
  computeRangeMetrics,
  HOUR_MS,
  toMs,
  type HourSample,
} from '@ventana/sim';
import { monthName } from '../i18n/format';
import type { I18n } from '../i18n/translate';
import { bodyWidget, EARTH, SUN } from './body-widget';
import { nowWidget } from './now-widget';
import type { WidgetRange } from './widget-range';
import type { SiteWidgets } from './widget-types';

/**
 * The sample of the hour `at`, or null when the hours hold none for it: a
 * later hour (the next month's first) never stands in for it.
 */
export function sampleAt(
  hours: readonly HourSample[],
  at: string,
): HourSample | null {
  const atMs = toMs(at);
  const inHour = (ms: number): boolean => ms >= atMs && ms < atMs + HOUR_MS;
  return hours.find((sample) => inHour(toMs(sample.t))) ?? null;
}

/** The samples from `first` to `last`, both ISO and inclusive. */
export function samplesWithin(
  hours: readonly HourSample[],
  first: string,
  last: string,
): HourSample[] {
  const [fromMs, toMsInclusive] = [toMs(first), toMs(last)];
  return hours.filter((sample) => {
    const ms = toMs(sample.t);
    return ms >= fromMs && ms <= toMsInclusive;
  });
}

/**
 * The widgets for the hour `range.at` of `hours` (the whole range), in
 * the language of `i18n`, or null when no sample covers it.
 */
export function siteWidgets(
  hours: readonly HourSample[],
  range: WidgetRange,
  i18n: I18n,
): SiteWidgets | null {
  const horizon = samplesWithin(hours, range.at, range.horizonEnd);
  const now = sampleAt(horizon, range.at);
  if (!now) return null;
  const month = samplesWithin(hours, range.from, range.monthEnd);
  const { windowPct } = computeRangeMetrics(month, now.t);
  const monthOf = monthName(i18n, toMs(range.from));
  return {
    now: nowWidget(now, windowPct, monthOf, i18n),
    sun: bodyWidget(SUN, horizon, now, i18n),
    earth: bodyWidget(EARTH, horizon, now, i18n),
  };
}
