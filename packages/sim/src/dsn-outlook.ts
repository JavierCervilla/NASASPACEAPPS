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
 * Reading a DSN timeline (`dsn-timeline.ts`) at an instant: who listens, until
 * when, who takes over and when, and each complex's runs over a day. Pure.
 */
import type { DsnSpan } from './dsn-timeline.ts';
import type { DsnComplex } from './site.ts';

/** A stretch of time: `startMs` included, `endMs` not. */
export interface Interval {
  readonly startMs: number;
  readonly endMs: number;
}

/** A complex and the minute it starts listening. */
export interface DsnTurn {
  readonly complex: DsnComplex;
  readonly startMs: number;
}

/** The DSN at an instant, read from a timeline. */
export interface DsnOutlook {
  /** The complex listening, or `null` when none sees the Moon above 10°. */
  readonly active: DsnComplex | null;
  /**
   * The first minute the listening changes (the handoff, or the end of the
   * silence); `null` when the timeline ends first.
   */
  readonly untilMs: number | null;
  /** The next complex to start listening; `null` when none in the timeline. */
  readonly next: DsnTurn | null;
}

/** The runs of `spans` where `keep` holds, touching runs merged. */
export function runsWhere(
  spans: readonly DsnSpan[],
  keep: (span: DsnSpan) => boolean,
): Interval[] {
  const runs: { startMs: number; endMs: number }[] = [];
  for (const span of spans) {
    if (!keep(span)) continue;
    const last = runs.at(-1);
    if (last?.endMs === span.startMs) last.endMs = span.endMs;
    else runs.push({ startMs: span.startMs, endMs: span.endMs });
  }
  return runs;
}

/** Every start of a complex's listening, in time order. */
export function turnsOf(spans: readonly DsnSpan[]): DsnTurn[] {
  const turns: DsnTurn[] = [];
  let previous: DsnComplex | null = null;
  for (const { active, startMs } of spans) {
    if (active && active !== previous) turns.push({ complex: active, startMs });
    previous = active;
  }
  return turns;
}

/** The first turn of `complex` (of any when null) starting after `atMs`. */
export function nextTurn(
  spans: readonly DsnSpan[],
  atMs: number,
  complex: DsnComplex | null = null,
): DsnTurn | null {
  const wanted = (turn: DsnTurn): boolean =>
    turn.startMs > atMs && (complex === null || turn.complex === complex);
  return turnsOf(spans).find(wanted) ?? null;
}

/**
 * Who listens at `atMs`, until when, and who comes next, from `spans`
 * that cover it; nothing known when they do not.
 */
export function dsnOutlook(
  spans: readonly DsnSpan[],
  atMs: number,
): DsnOutlook {
  const at = spans.findIndex((s) => atMs >= s.startMs && atMs < s.endMs);
  if (at < 0) return { active: null, untilMs: null, next: null };
  const active = spans[at]?.active ?? null;
  const after = spans.slice(at).find((s) => s.active !== active);
  const untilMs = after?.startMs ?? null;
  return { active, untilMs, next: nextTurn(spans, atMs) };
}
