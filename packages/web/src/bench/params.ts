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
 * The benchmark's address (VENT-81). `?bench` turns it on, and
 * `?bench=depth` picks the depth suite (VENT-104; any other value, or none,
 * the A/B suite); `benchRuns=1` or `3` presets the runs per variant (3 by
 * default; the depth suite's rounds, 1 by default); `benchFast` scales
 * the script's waits and turns down for software GL (the e2e); and
 * `benchRun=k` is written by the benchmark itself: the page load that does
 * the k-th run (0-based) of the order kept in `sessionStorage`. Pure.
 */
import { BENCH_PARAM } from '../lib/bench-param';
import {
  askedSuite, setDepth, type DepthVariant,
} from './depth-suite';
import { START_SITE } from './script';
import type { RunCount, Suite } from './types';

const RUNS = 'benchRuns';
const FAST = 'benchFast';
const RUN = 'benchRun';
/** The pin's point: a run always opens on the listed start site. */
const POINT = ['lat', 'lon'] as const;

export interface BenchOptions {
  /** `?bench=depth`; absent for the A/B suite. */
  readonly suite?: Suite;
  readonly runs: RunCount;
  readonly fast: boolean;
  /** The run this page load does; null for a page the human opened. */
  readonly run: number | null;
}

/** `benchRuns`: 3 unless it says 1; the depth suite 1 unless it says 3. */
function runCount(asked: string | null, suite: Suite | undefined): RunCount {
  if (suite) return asked === '3' ? 3 : 1;
  return asked === '1' ? 1 : 3;
}

/** What the address asks of the benchmark. */
export function benchOptions(search: string): BenchOptions {
  const params = new URLSearchParams(search);
  const run = Number.parseInt(params.get(RUN) ?? '', 10);
  const suite = askedSuite(params);
  return {
    ...(suite ? { suite } : {}),
    runs: runCount(params.get(RUNS), suite),
    fast: params.has(FAST),
    run: Number.isInteger(run) && run >= 0 ? run : null,
  };
}

// Leading slashes or backslashes would make a protocol-relative URL, which
// leaves the site (seguridad round 1 on PR #56): the path keeps one «/».
const LEADING_SLASHES = /^[/\\]+/;

/** `pathname` that can only name a path on this site. */
function sitePath(pathname: string): string {
  return pathname.replace(LEADING_SLASHES, '/');
}

/**
 * The address of the page load that does run `k`; null: the results. A
 * depth-suite load names its variant (null: the results), whose switches
 * replace the last run's.
 */
export function runHref(
  where: Pick<Location, 'pathname' | 'search'>,
  k: number | null,
  depth?: DepthVariant | null,
): string {
  const params = new URLSearchParams(where.search);
  for (const name of POINT) params.delete(name);
  if (depth !== undefined) setDepth(params, depth);
  params.set('site', START_SITE);
  if (k === null) params.delete(RUN);
  else params.set(RUN, String(k));
  return `${sitePath(where.pathname)}?${params.toString()}`;
}

/** The address without the benchmark: what «Close» opens. */
export function plainHref(
  where: Pick<Location, 'pathname' | 'search'>,
): string {
  const params = new URLSearchParams(where.search);
  if (askedSuite(params)) setDepth(params, null);
  for (const name of [BENCH_PARAM, RUNS, FAST, RUN]) params.delete(name);
  const query = params.toString();
  return `${sitePath(where.pathname)}${query ? `?${query}` : ''}`;
}
