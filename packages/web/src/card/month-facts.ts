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
 * The site card's figures for the visible month: the shares of hours with
 * Sun, with Earth and with both (the landing window), the share with a DSN
 * complex listening (VENT-7), the longest window and the longest night.
 * The rules and the counting are `@ventana/sim`'s (`computeRangeMetrics`),
 * the same the calendar bars use. Pure.
 */
import { computeRangeMetrics, type HourSample } from '@ventana/sim';
import { monthSamples } from '../calendar/month-samples';
import { formatPercent } from '../i18n/format';
import type { I18n } from '../i18n/translate';
import { formatDuration } from '../phone/format';

/** One row of the card's list; `tone` colours the value. */
export interface FactRow {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'window';
}

/** The share of `samples` with a DSN complex listening, 0-100. */
const dsnShare = (samples: readonly HourSample[]): number =>
  (samples.filter((s) => s.dsn !== null).length / samples.length) * 100;

/** The figures of the month of `atMs`; null when `hours` hold none of it. */
export function monthFacts(
  hours: readonly HourSample[],
  atMs: number,
  i18n: I18n,
): readonly FactRow[] | null {
  const samples = monthSamples(hours, atMs);
  const first = samples[0];
  if (!first) return null;
  const metrics = computeRangeMetrics(samples, first.t);
  const { t } = i18n;
  const share = (pct: number): string => formatPercent(i18n, pct);
  const span = (hoursLong: number | undefined, none: string): string =>
    hoursLong === undefined ? none : formatDuration(i18n, hoursLong);
  const longest = metrics.longestWindow?.hours;
  const night = metrics.longestNight?.hours;
  return [
    { label: t('facts.sun'), value: share(metrics.sunPct) },
    { label: t('facts.earth'), value: share(metrics.earthPct) },
    { label: t('facts.window'), value: share(metrics.windowPct), tone: 'window' },
    { label: t('facts.dsn'), value: share(dsnShare(samples)) },
    { label: t('facts.longestWindow'), value: span(longest, t('facts.noWindow')) },
    { label: t('facts.longestNight'), value: span(night, t('facts.noNight')) },
  ];
}
