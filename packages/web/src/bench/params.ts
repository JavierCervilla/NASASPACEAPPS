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
 * The benchmark's address (VENT-81). `?bench` turns it on; `benchRuns=1`
 * or `3` presets the runs per variant (3 by default); `benchFast` scales
 * the script's waits and turns down for software GL (the e2e); and
 * `benchRun=k` is written by the benchmark itself: the page load that does
 * the k-th run (0-based) of the order kept in `sessionStorage`. Pure.
 */
import { BENCH_PARAM } from '../lib/bench-param';
import { START_SITE } from './script';
import type { RunCount } from './types';

const RUNS = 'benchRuns';
const FAST = 'benchFast';
const RUN = 'benchRun';
/** The pin's point: a run always opens on the listed start site. */
const POINT = ['lat', 'lon'] as const;

export interface BenchOptions {
  readonly runs: RunCount;
  readonly fast: boolean;
  /** The run this page load does; null for a page the human opened. */
  readonly run: number | null;
}

/** What the address asks of the benchmark. */
export function benchOptions(search: string): BenchOptions {
  const params = new URLSearchParams(search);
  const run = Number.parseInt(params.get(RUN) ?? '', 10);
  return {
    runs: params.get(RUNS) === '1' ? 1 : 3,
    fast: params.has(FAST),
    run: Number.isInteger(run) && run >= 0 ? run : null,
  };
}

/** The address of the page load that does run `k`; null: the results. */
export function runHref(
  where: Pick<Location, 'pathname' | 'search'>,
  k: number | null,
): string {
  const params = new URLSearchParams(where.search);
  for (const name of POINT) params.delete(name);
  params.set('site', START_SITE);
  if (k === null) params.delete(RUN);
  else params.set(RUN, String(k));
  return `${where.pathname}?${params.toString()}`;
}

/** The address without the benchmark: what «Close» opens. */
export function plainHref(
  where: Pick<Location, 'pathname' | 'search'>,
): string {
  const params = new URLSearchParams(where.search);
  for (const name of [BENCH_PARAM, RUNS, FAST, RUN]) params.delete(name);
  const query = params.toString();
  return `${where.pathname}${query ? `?${query}` : ''}`;
}
