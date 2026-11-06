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
 * The benchmark's page loads (VENT-81): each run is one clean load.
 * «Start» keeps a new state and reloads at the first run; a run that ends
 * keeps its result and reloads at the next, or at the results; «Stop»
 * forgets it and reloads at the first state, and «Close» leaves `?bench`.
 * Each leaves on purpose (leave.ts). A depth-suite load (VENT-104) carries
 * its variant's switches, and the results and the first state none.
 */
import { isDepthVariant } from './depth-suite';
import { leaveTo, pageLeave } from './leave';
import { benchOptions, plainHref, runHref } from './params';
import {
  finished, recordRun, startState, type RunExtra,
} from './run-state';
import { clearState, sessionStore, writeState } from './state-store';
import type { BenchHeader, BenchState, RunCount, RunResult } from './types';

/** The address of `state`'s run `k`; null: its results. */
function loadHref(state: Pick<BenchState, 'suite' | 'order'>,
  k: number | null): string {
  if (!state.suite) return runHref(location, k);
  const variant = k === null ? null : state.order[k];
  return runHref(location, k, isDepthVariant(variant) ? variant : null);
}

/** Keeps a new benchmark of `runs` runs and opens its first run. */
export function startBench(runs: RunCount): void {
  const { fast, suite } = benchOptions(location.search);
  const state = startState(runs, fast, suite);
  writeState(sessionStore(), state);
  leaveTo(loadHref(state, 0), pageLeave());
}

/** Forgets the benchmark; `leave` also leaves `?bench`. */
export function endBench(leave: boolean): void {
  const { suite } = benchOptions(location.search);
  clearState(sessionStore());
  leaveTo(leave ? plainHref(location)
    : loadHref({ order: [], ...(suite ? { suite } : {}) }, null),
  pageLeave());
}

/** Keeps the run `state` was at and opens the next run, or the results. */
export function nextLoad(
  state: BenchState,
  steps: RunResult['steps'],
  header: BenchHeader,
  extra: RunExtra = {},
): void {
  const next = recordRun(state, steps, header, extra);
  writeState(sessionStore(), next);
  leaveTo(loadHref(next, finished(next) ? null : next.next), pageLeave());
}
