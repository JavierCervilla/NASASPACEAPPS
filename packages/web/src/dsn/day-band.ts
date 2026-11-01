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
 * The DSN view's 24 h band (VENT-7, canvas «DsnC»): for the UTC day of the
 * instant, one row per complex with the stretches where it sees the Moon
 * above 10° and, within them, where it is the one listening; each as a
 * fraction of the day, with the playhead where the instant falls. Pure.
 */
import {
  DSN_COMPLEXES,
  runsWhere,
  type DsnComplex,
  type DsnSpan,
  type Interval,
} from '@ventana/sim';
import { dayStartOf } from './dsn-days';

const DAY_MS = 86_400_000;

/** A stretch of the day, as fractions from 0 (00:00) to 1 (24:00). */
export interface DayPart {
  readonly from: number;
  readonly to: number;
}

export interface BandRow {
  readonly complex: DsnComplex;
  readonly above: readonly DayPart[];
  readonly active: readonly DayPart[];
  /** Whether it listens at the instant. */
  readonly now: boolean;
}

export interface DayBand {
  readonly dayStartMs: number;
  readonly rows: readonly BandRow[];
  /** Where the instant falls, 0 to 1. */
  readonly playhead: number;
}

/** `runs` cut to the day starting at `day`, as fractions of it. */
function partsOf(runs: readonly Interval[], day: number): DayPart[] {
  const clip = (ms: number): number =>
    Math.min(1, Math.max(0, (ms - day) / DAY_MS));
  return runs
    .map((run) => ({ from: clip(run.startMs), to: clip(run.endMs) }))
    .filter((part) => part.to > part.from);
}

/** The band of the UTC day of `atMs`, from spans that cover it. */
export function dayBand(spans: readonly DsnSpan[], atMs: number): DayBand {
  const day = dayStartOf(atMs);
  const at = spans.find((s) => atMs >= s.startMs && atMs < s.endMs);
  const rows = DSN_COMPLEXES.map((complex) => ({
    complex,
    above: partsOf(runsWhere(spans, (s) => s.above.includes(complex)), day),
    active: partsOf(runsWhere(spans, (s) => s.active === complex), day),
    now: at?.active === complex,
  }));
  return { dayStartMs: day, rows, playhead: (atMs - day) / DAY_MS };
}
