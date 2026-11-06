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
 * The depth suite's report (VENT-104), in the plain English of report.ts:
 * the header every report has, the suite and its order, one line per run
 * as the results' row says it, and every step of every run. `benchReport`
 * picks the report of a state's suite. Pure.
 */
import { depthRows, type DepthRow } from './depth-results';
import { DEPTH_SCRIPT_VERSION } from './depth-script';
import { DEPTH_VARIANTS } from './depth-suite';
import { num, reportText, runLines } from './report';
import { deviceLines } from './report-notes';
import type { BenchState } from './types';

/** «yes», «no», or «n/a» when it is not known. */
const yesNo = (value: boolean | null): string =>
  value === null ? 'n/a' : (value ? 'yes' : 'no');

/** «survived», or when the view lost its context. */
function outcome(row: DepthRow): string {
  if (!row.lostAt) return 'survived';
  const where = row.lostAt.step === 'openView' ? 'of opening' : 'of the turn';
  return `lost after ${num(row.lostAt.seconds)} s ${where}`;
}

/** A run's line: its outcome, what it drew with and the turn's frames. */
function rowLine(row: DepthRow): string {
  const d = row.depth;
  const map = d?.shadowMap == null ? 'n/a' : (d.shadowMap ? 'on' : 'off');
  return [
    `${row.name}: ${outcome(row)}`, `depth ${d?.drawn ?? 'n/a'}`,
    `${num(d?.bits ?? null)} bits`, `reversed buffer ${yesNo(d?.reversed
      ?? null)}`, `shadow map ${map}`, `fps ${num(row.fps)}`,
    `p95Ms ${num(row.p95)}`, `worstMs ${num(row.worst)}`,
  ].join(' · ');
}

/** The depth suite's whole report. */
export function depthReportText(state: BenchState): string {
  const rounds = state.runs === 1 ? '1 round' : `${state.runs} rounds`;
  return [
    ...deviceLines(state),
    `Suite: depth (script v${DEPTH_SCRIPT_VERSION}). Runs: ${rounds}, order ${DEPTH_VARIANTS.join(' ')}${
      state.fast ? ' (fast script)' : ''}`,
    'log: the app as it is. reversed, linear: that depth buffer, shadow map'
      + ' forced. log+shadows: logarithmic depth, shadow map forced.',
    '', 'Every run', ...depthRows(state.results).map(rowLine),
    '', 'Every step', ...runLines(state.results), '',
  ].join('\n');
}

/** The report of `state`'s suite. */
export const benchReport = (state: BenchState): string =>
  (state.suite === 'depth' ? depthReportText(state) : reportText(state));
