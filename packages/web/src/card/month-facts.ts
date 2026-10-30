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
 * Sun, with Earth and with both (the landing window), the longest window
 * and the longest night. The rules and the counting are `@ventana/sim`'s
 * (`computeRangeMetrics`), the same the calendar bars use. Pure.
 */
import { computeRangeMetrics, type HourSample } from '@ventana/sim';
import { monthSamples } from '../calendar/month-samples';
import { formatDuration } from '../phone/format';

/** One row of the card's list; `tone` colours the value. */
export interface FactRow {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'window';
}

/** The figures of the month of `atMs`; null when `hours` hold none of it. */
export function monthFacts(
  hours: readonly HourSample[],
  atMs: number,
): readonly FactRow[] | null {
  const samples = monthSamples(hours, atMs);
  const first = samples[0];
  if (!first) return null;
  const metrics = computeRangeMetrics(samples, first.t);
  const share = (pct: number): string => `${Math.round(pct)} %`;
  const span = (hoursLong: number | undefined, none: string): string =>
    hoursLong === undefined ? none : formatDuration(hoursLong);
  return [
    { label: 'Hours with Sun', value: share(metrics.sunPct) },
    { label: 'Hours with Earth', value: share(metrics.earthPct) },
    {
      label: 'Landing window',
      value: share(metrics.windowPct),
      tone: 'window',
    },
    { label: 'Longest window', value: span(metrics.longestWindow?.hours, 'None') },
    { label: 'Longest night', value: span(metrics.longestNight?.hours, 'No night') },
  ];
}
