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
 * The results table (VENT-81, the canvas «Results A vs B»): the on-foot
 * view's full turn (step d), each metric the median over a variant's
 * runs (a lost context: any run's, any step's), with B's change against
 * A: a percentage, or a difference for the contexts. Pure; the panel
 * writes the numbers through Intl.
 */
import { median } from './stats';
import type { RunResult, StepMetrics, Variant } from './types';

export type MetricId =
  | 'fps' | 'p95' | 'worst' | 'longTasks' | 'contexts' | 'texture' | 'heap'
  | 'lost';

export type Change =
  | { readonly kind: 'percent'; readonly value: number }
  | { readonly kind: 'diff'; readonly value: number }
  | null;

export interface ResultRow {
  readonly id: MetricId;
  readonly a: number | null;
  readonly b: number | null;
  readonly change: Change;
  /** Bold in the canvas: the rows the decision rests on. */
  readonly strong: boolean;
}

type Reader = (step: StepMetrics) => number | null;

const MB = 1024 * 1024;
/** 1 when any step of any of `variant`'s runs lost a context, else 0. */
const lostIn = (results: readonly RunResult[], variant: Variant): number =>
  results.some((r) => r.variant === variant
    && r.steps.some((s) => s.lost > 0)) ? 1 : 0;

/** Each metric: how a run gives it, and how B's change is said. */
const METRICS: readonly (readonly [MetricId, Reader, 'percent' | 'diff' | null,
  boolean])[] = [
  ['fps', (s) => s.frames.fps, 'percent', true],
  ['p95', (s) => s.frames.p95Ms, 'percent', true],
  ['worst', (s) => s.frames.worstMs, 'percent', false],
  ['longTasks', (s) => s.longTaskMs / 1000, 'percent', false],
  ['contexts', (s) => s.contexts, 'diff', true],
  ['texture', (s) => s.textureBytes / MB, 'percent', true],
  ['heap', (s) => (s.heapBytes === null ? null : s.heapBytes / MB),
    'percent', false],
  ['lost', (s) => s.lost, null, true],
];

/** The median over `variant`'s runs of what `pick` reads in step `id`. */
export function variantMedian(
  results: readonly RunResult[],
  variant: Variant,
  pick: Reader,
  id: StepMetrics['id'] = 'turn',
): number | null {
  const values = results.filter((r) => r.variant === variant).flatMap((r) => {
    const step = r.steps.find((s) => s.id === id);
    const value = step ? pick(step) : null;
    return value === null ? [] : [value];
  });
  return median(values);
}

/** B against A, as `kind` says; null when either is missing. */
function changeOf(
  a: number | null,
  b: number | null,
  kind: 'percent' | 'diff' | null,
): Change {
  if (kind === null || a === null || b === null) return null;
  if (kind === 'diff') return { kind, value: b - a };
  return a === 0 ? null : { kind, value: ((b - a) / a) * 100 };
}

/** The table's rows, in the canvas's order. */
export function resultRows(results: readonly RunResult[]): ResultRow[] {
  return METRICS.map(([id, pick, kind, strong]) => {
    const of = (v: Variant) => (id === 'lost' ? lostIn(results, v)
      : variantMedian(results, v, pick));
    const [a, b] = [of('A'), of('B')];
    return { id, a, b, change: changeOf(a, b, kind), strong };
  });
}
