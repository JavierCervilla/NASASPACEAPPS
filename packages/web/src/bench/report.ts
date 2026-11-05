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
 * The plain-text report «Copy report» copies (VENT-81): the header, the
 * median of every step and metric per variant, and every step of every
 * run. Plain English for whoever reads it next to the code, never
 * translated. Pure.
 */
import { noteLines } from './report-notes';
import { variantMedian } from './results';
import type { BenchState, RunResult, StepMetrics } from './types';

type Read = (step: StepMetrics) => number | null;

/** The report's metrics: name and how a step gives it. */
const METRICS: readonly (readonly [string, Read])[] = [
  ['ms', (s) => s.ms],
  ['fps', (s) => s.frames.fps],
  ['p95Ms', (s) => s.frames.p95Ms],
  ['worstMs', (s) => s.frames.worstMs],
  ['drawn', (s) => s.frames.drawn],
  ['longTasks', (s) => s.longTasks],
  ['longTaskMs', (s) => s.longTaskMs],
  ['contexts', (s) => s.contexts],
  ['globeMapBytes', (s) => s.textureBytes],
  ['onFootTextures', (s) => s.textures],
  ['heapBytes', (s) => s.heapBytes],
  ['triangles', (s) => s.triangles],
  ['calls', (s) => s.calls],
  ['netBytes', (s) => s.netBytes],
  ['requests', (s) => s.requests],
  ['lost', (s) => s.lost],
  ['timedOut', (s) => (s.timedOut ? 1 : 0)],
];

/** `value` with at most one decimal, or «n/a». */
const num = (value: number | null): string =>
  value === null ? 'n/a' : String(Math.round(value * 10) / 10);

/** The header's lines. */
function headerLines(state: BenchState): string[] {
  const h = state.header;
  const order = state.order.join(' ');
  return [
    'Ventana Lunar benchmark report',
    `Script v${h?.script ?? '?'} · instant ${h?.instant ?? '?'}`,
    `GPU: ${h?.gpu ?? '?'}`, `Browser: ${h?.userAgent ?? '?'}`,
    `Viewport: ${h?.viewport ?? '?'}`, `Screen: ${h?.screen ?? '?'}`,
    `Build: ${h?.build ?? '?'}`, ...noteLines(state),
    `Runs: ${state.runs} per variant, order ${order}${state.fast
      ? ' (fast script)' : ''}`,
    'A: globe kept. B: globe WebGL context released while the 3D view is'
      + ' open.',
  ];
}

/** One line per step and metric: the median of A and of B. */
function medianLines(results: readonly RunResult[]): string[] {
  const ids = results[0]?.steps.map((s) => s.id) ?? [];
  return ids.flatMap((id) => METRICS.map(([name, read]) => {
    const a = variantMedian(results, 'A', read, id);
    const b = variantMedian(results, 'B', read, id);
    return `${id} ${name}: A ${num(a)} · B ${num(b)}`;
  }));
}

/** One line per step of every run, every metric on it. */
function runLines(results: readonly RunResult[]): string[] {
  return results.flatMap((r) => r.steps.map((step) => {
    const values = METRICS.map(([name, read]) => `${name}=${num(read(step))}`);
    return `${r.variant}${r.run} ${step.id}: ${values.join(' ')}`;
  }));
}

/** The whole report of `state`. */
export function reportText(state: BenchState): string {
  return [
    ...headerLines(state), '', 'Medians per variant', ...medianLines(
      state.results), '', 'Every run', ...runLines(state.results), '',
  ].join('\n');
}
