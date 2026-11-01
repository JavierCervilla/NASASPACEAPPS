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
 * The DSN timeline the views read, worked out once per UTC day: from the
 * day's start to two days on, so the instant, its handoff and the complex
 * after it are always inside. A few days are kept, so scrubbing back and
 * forth or playing never works one out twice in a row. Not a module
 * global: each island makes its own.
 */
import { dsnSpans, type DsnSpan } from '@ventana/sim';

const DAY_MS = 86_400_000;
const AHEAD_DAYS = 2;
const KEPT_DAYS = 4;

export interface DsnDays {
  /** The spans from the UTC day of `atMs` to two days after. */
  readonly spansFor: (atMs: number) => readonly DsnSpan[];
}

/** The start of the UTC day of `atMs`. */
export const dayStartOf = (atMs: number): number =>
  Math.floor(atMs / DAY_MS) * DAY_MS;

export function createDsnDays(
  compute: (fromMs: number, toMs: number) => DsnSpan[] = dsnSpans,
): DsnDays {
  const kept = new Map<number, readonly DsnSpan[]>();
  return {
    spansFor: (atMs) => {
      const day = dayStartOf(atMs);
      const known = kept.get(day);
      if (known) return known;
      const spans = compute(day, day + AHEAD_DAYS * DAY_MS);
      kept.set(day, spans);
      const oldest = kept.keys().next().value;
      if (kept.size > KEPT_DAYS && oldest !== undefined) kept.delete(oldest);
      return spans;
    },
  };
}
