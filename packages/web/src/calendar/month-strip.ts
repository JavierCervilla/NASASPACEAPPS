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
 * The calendar's three bars for one site and month: where the Sun is up,
 * where the Earth is, and where both are (the landing window), as % of
 * the month, with the month's shares. The rules are `@ventana/sim`'s, the
 * same the widgets use (Sun above 0°, Earth above 3°).
 */
import {
  computeRangeMetrics,
  groupBlocks,
  hasEarth,
  hasSun,
  hoursBetween,
  isWindow,
  toIso,
  type HourSample,
} from '@ventana/sim';
import { samplesWithin } from '../phone/site-widgets';
import { monthEndMs, monthHours, monthStartMs } from './month';
import { hourOfMonth } from './time-actions';

/** A run of hours, as % of the month from its first hour. */
export interface Segment {
  readonly startPct: number;
  readonly widthPct: number;
}

export interface MonthStrip {
  readonly sun: readonly Segment[];
  readonly earth: readonly Segment[];
  readonly window: readonly Segment[];
  /** Shares of the month's hours, 0 to 100. */
  readonly sunPct: number;
  readonly earthPct: number;
  readonly windowPct: number;
}

interface MonthSpan {
  readonly first: string;
  readonly hours: number;
}

function segments(
  samples: readonly HourSample[],
  holds: (sample: HourSample) => boolean,
  month: MonthSpan,
): Segment[] {
  const pct = (hours: number): number => (100 * hours) / month.hours;
  return groupBlocks(samples, holds).map((block) => ({
    startPct: pct(hoursBetween(month.first, block.start)),
    widthPct: pct(block.hours),
  }));
}

/**
 * The bars of the month holding `atMs`, from `hours` (which may run past
 * the month); null when none of them falls in it.
 */
export function monthStrip(
  hours: readonly HourSample[],
  atMs: number,
): MonthStrip | null {
  const first = toIso(monthStartMs(atMs));
  const samples = samplesWithin(hours, first, toIso(monthEndMs(atMs)));
  if (samples.length === 0) return null;
  const month = { first, hours: monthHours(atMs) };
  const of = (holds: (sample: HourSample) => boolean): Segment[] =>
    segments(samples, holds, month);
  const { sunPct, earthPct, windowPct } = computeRangeMetrics(samples, first);
  const bars = { sun: of(hasSun), earth: of(hasEarth), window: of(isWindow) };
  return { ...bars, sunPct, earthPct, windowPct };
}

/** Where the hour of `atMs` sits across its month, in %. */
export function instantPct(atMs: number): number {
  return (100 * hourOfMonth(atMs)) / monthHours(atMs);
}
