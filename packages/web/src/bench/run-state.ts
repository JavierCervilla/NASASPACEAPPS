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
 * The benchmark's state across the page loads of its runs (VENT-81): the
 * order A1 B1 A2 B2 A3 B3 (or A B for one run each; the depth suite's
 * in depth-suite.ts), the next run, the
 * results so far and the device's header, kept in `sessionStorage` under
 * `ventana.bench`. A stored state that does not read back is no state.
 * Pure but for the injected storage.
 */
import { depthOrder } from './depth-suite';
import type {
  BenchHeader, BenchState, RunCount, RunResult, Suite, Variant,
} from './types';

export const STATE_KEY = 'ventana.bench';

export type StateStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The variants in run order: A and B alternate, `runs` times. */
export function runOrder(runs: RunCount): Variant[] {
  return Array.from({ length: runs }, () => ['A', 'B'] as const).flat();
}

/**
 * A new benchmark of `runs` runs per variant, at its first run; the depth
 * suite (VENT-104) runs its own order, `runs` rounds of it.
 */
export const startState = (
  runs: RunCount,
  fast: boolean,
  suite?: Suite,
): BenchState => ({ v: 1, ...(suite ? { suite } : {}), runs, fast,
  order: suite ? depthOrder(runs) : runOrder(runs), next: 0, results: [],
  header: null });

/** What a depth-suite run keeps besides its steps (VENT-104). */
export type RunExtra = Pick<RunResult, 'depth' | 'lostAt'>;

/** `state` after run `state.next` measured `steps`, with the header. */
export function recordRun(
  state: BenchState,
  steps: RunResult['steps'],
  header: BenchHeader,
  extra: RunExtra = {},
): BenchState {
  const variant = state.order[state.next] ?? 'A';
  const run = state.order.slice(0, state.next + 1)
    .filter((v) => v === variant).length;
  const result = { variant, run, tier: header.tier, steps, ...extra };
  return { ...state, next: state.next + 1, header,
    results: [...state.results, result] };
}

/** Whether every run of `state` is done. */
export const finished = (state: BenchState): boolean =>
  state.next >= state.order.length;

/** The kept state; null when none is kept or it does not read back. */
export function readState(storage: StateStorage | null): BenchState | null {
  try {
    const raw = storage?.getItem(STATE_KEY);
    const state = raw ? (JSON.parse(raw) as BenchState) : null;
    const ok = state?.v === 1 && Array.isArray(state.order)
      && Array.isArray(state.results) && Number.isInteger(state.next)
      // A suite this build does not know: no state (VENT-107).
      && (state.suite === undefined || state.suite === 'depth');
    return ok ? state : null;
  } catch {
    return null;
  }
}
