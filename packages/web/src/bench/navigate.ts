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
 * Each leaves on purpose (leave.ts).
 */
import { leaveTo, pageLeave } from './leave';
import { benchOptions, plainHref, runHref } from './params';
import { finished, recordRun, startState } from './run-state';
import { clearState, sessionStore, writeState } from './state-store';
import type { BenchHeader, BenchState, RunCount, RunResult } from './types';

/** Keeps a new benchmark of `runs` runs and opens its first run. */
export function startBench(runs: RunCount): void {
  const { fast } = benchOptions(location.search);
  writeState(sessionStore(), startState(runs, fast));
  leaveTo(runHref(location, 0), pageLeave());
}

/** Forgets the benchmark; `leave` also leaves `?bench`. */
export function endBench(leave: boolean): void {
  clearState(sessionStore());
  leaveTo(leave ? plainHref(location) : runHref(location, null), pageLeave());
}

/** Keeps the run `state` was at and opens the next run, or the results. */
export function nextLoad(
  state: BenchState,
  steps: RunResult['steps'],
  header: BenchHeader,
): void {
  const next = recordRun(state, steps, header);
  writeState(sessionStore(), next);
  leaveTo(runHref(location, finished(next) ? null : next.next), pageLeave());
}
