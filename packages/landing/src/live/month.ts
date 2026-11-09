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

import {
  HOUR_MS,
  hasEarth,
  hasSun,
  isWindow,
  toIso,
  type HourSample,
} from '@ventana/sim';
import { siteHours } from './hours';

/** A stretch of the month, as shares of it from 0 to 1. */
export interface Run {
  readonly from: number;
  readonly to: number;
}

/** The month strip: when IM-2 has Sun, Earth and both, in one UTC month. */
export interface MonthBars {
  readonly monthStartMs: number;
  readonly sun: readonly Run[];
  readonly earth: readonly Run[];
  readonly window: readonly Run[];
  /** Where `atMs` falls in the month, from 0 to 1. */
  readonly now: number;
  /** The share of the month's hours that are a window. */
  readonly windowShare: number;
}

/** The strip of the UTC month that holds `atMs`. */
export function monthBars(atMs: number): MonthBars {
  const at = new Date(atMs);
  const start = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1);
  const end = Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1);
  const hours = siteHours(toIso(start), toIso(end - HOUR_MS));
  const windows = hours.filter((h) => isWindow(h)).length;
  return {
    monthStartMs: start,
    sun: runsOf(hours, hasSun),
    earth: runsOf(hours, hasEarth),
    window: runsOf(hours, isWindow),
    now: (atMs - start) / (end - start),
    windowShare: hours.length === 0 ? 0 : windows / hours.length,
  };
}

/** The stretches where `test` holds, each hour 1/n of the month. */
export function runsOf(
  hours: readonly HourSample[],
  test: (hour: HourSample) => boolean,
): Run[] {
  const runs: Run[] = [];
  const n = hours.length;
  let from = -1;
  hours.forEach((hour, i) => {
    if (test(hour) && from < 0) from = i;
    if (!test(hour) && from >= 0) {
      runs.push({ from: from / n, to: i / n });
      from = -1;
    }
  });
  if (from >= 0) runs.push({ from: from / n, to: 1 });
  return runs;
}
