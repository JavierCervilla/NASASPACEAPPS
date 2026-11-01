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
 * Which DSN complex listens to the Moon, minute by minute: the analytic sky
 * of `dsn-sky.ts` run through the spec's rule (`activeDsn`, the complex that
 * sees the Moon highest above 10°). The state does not depend on the lunar
 * site: the antennas track the Moon, not the lander.
 */
import { moonElevationsByDsn } from './dsn-sky.ts';
import { DSN_COMPLEXES, DSN_SITES } from './dsn-sites.ts';
import { MINUTE_MS, minuteRuns } from './minute-runs.ts';
import { moonPosition } from './moon.ts';
import type { DsnComplex } from './site.ts';
import { activeDsn, DSN_MIN_ELEVATION_DEG } from './visibility.ts';

/** What the Deep Space Network does at one instant. */
export interface DsnState {
  /** The complex listening, or `null` when none sees the Moon above 10°. */
  readonly active: DsnComplex | null;
  /** Every complex that sees the Moon above 10°, in `DSN_COMPLEXES` order. */
  readonly above: readonly DsnComplex[];
}

/** A run of whole minutes with one {@link DsnState}; `endMs` excluded. */
export interface DsnSpan extends DsnState {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * Five minutes between samples: the shortest run seen in November and
 * December 2026 (no complex above 10°, a handoff gap) lasts seven.
 */
const STEP_MS = 5 * MINUTE_MS;

/** The Moon's elevation over each complex at Unix time `ms`, degrees. */
export function dsnElevations(ms: number): Record<DsnComplex, number> {
  return moonElevationsByDsn(DSN_SITES, ms, moonPosition(ms));
}

/** The DSN's state at Unix time `ms`. */
export function dsnStateAt(ms: number): DsnState {
  const elevations = dsnElevations(ms);
  const above = DSN_COMPLEXES.filter(
    (complex) => elevations[complex] > DSN_MIN_ELEVATION_DEG,
  );
  return { active: activeDsn(elevations), above };
}

/** A state as one comparable string. */
const keyOf = ({ active, above }: DsnState): string =>
  `${active ?? ''}|${above.join(',')}`;

/**
 * The DSN's state from `fromMs` (rounded down to a minute) to `toMs`, as
 * runs whose boundaries fall on the first whole minute of the new state.
 */
export function dsnSpans(fromMs: number, toMs: number): DsnSpan[] {
  const states = new Map<string, DsnState>();
  const keyAt = (ms: number): string => {
    const state = dsnStateAt(ms);
    const key = keyOf(state);
    states.set(key, state);
    return key;
  };
  const runs = minuteRuns({ keyAt, fromMs, toMs, stepMs: STEP_MS });
  return runs.map(({ startMs, endMs, key }) => {
    const { active, above } = states.get(key) as DsnState;
    return { startMs, endMs, active, above };
  });
}
