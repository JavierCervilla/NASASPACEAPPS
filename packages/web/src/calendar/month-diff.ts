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
 * Where the simulator and Horizons disagree in a month («Compare»): for
 * each bar, the runs of hours where its signal (Sun, Earth or window)
 * holds on one side only, placed like the bars; and how many of the
 * month's hours disagree on any of the three. Only the hours both sides
 * hold count. Pure.
 */
import {
  hasEarth,
  hasSun,
  isWindow,
  toIso,
  type HourSample,
} from '@ventana/sim';
import { monthHours, monthStartMs } from './month';
import { monthSamples } from './month-samples';
import { segments, type Segment } from './month-strip';

export interface MonthDiff {
  readonly sun: readonly Segment[];
  readonly earth: readonly Segment[];
  readonly window: readonly Segment[];
  /** The month's hours where any of the three disagrees. */
  readonly hours: number;
}

type Signal = (sample: HourSample) => boolean;

const SIGNALS: readonly Signal[] = [hasSun, hasEarth, isWindow];

/** The month of `atMs` in `horizons` against the same hours `computed`. */
export function monthDiff(
  horizons: readonly HourSample[],
  computed: readonly HourSample[],
  atMs: number,
): MonthDiff {
  const other = new Map(computed.map((sample) => [sample.t, sample]));
  const samples = monthSamples(horizons, atMs);
  const differs = (signal: Signal) => (sample: HourSample) => {
    const twin = other.get(sample.t);
    return twin !== undefined && signal(sample) !== signal(twin);
  };
  const month = { first: toIso(monthStartMs(atMs)), hours: monthHours(atMs) };
  const [sun, earth, window] = SIGNALS.map((signal) =>
    segments(samples, differs(signal), month),
  );
  const any = (sample: HourSample): boolean =>
    SIGNALS.some((signal) => differs(signal)(sample));
  const hours = samples.filter(any).length;
  return { sun: sun ?? [], earth: earth ?? [], window: window ?? [], hours };
}
