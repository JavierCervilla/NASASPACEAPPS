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

/** Records for the benchmark's tests (VENT-81). */
import type { StepId } from '../src/bench/script';
import type { BenchHeader, BenchState, RunResult, StepMetrics, Variant } from '../src/bench/types';

const IDS: readonly StepId[] = ['globeIdle', 'globeMoves', 'openView', 'turn', 'changePoint', 'backToGlobe'];

export const HEADER: BenchHeader = {
  gpu: 'PowerVR D-Series DXT-48-1536', userAgent: 'Mozilla/5.0 (Linux; Android 16) Chrome/142.0.0.0 Mobile Safari/537.36',
  viewport: '412 × 839 @ 2.625', screen: '412 × 915', tier: 'medium', script: 1, build: 'ab12cd34ef56', instant: '1967-03-19T12:00:00Z',
};

/** A step whose numbers all come from `base`. */
export function step(id: StepId, base: number, over: Partial<StepMetrics> = {}): StepMetrics {
  return {
    id, ms: base * 100, frames: { fps: base, p95Ms: 1000 / base, worstMs: 2000 / base, drawn: 10 },
    longTasks: 1, longTaskMs: base * 10, contexts: 2, textureBytes: 1024 * 1024 * base, textures: 3,
    heapBytes: 1024 * 1024 * 40, triangles: 1000, calls: 30, netBytes: 500, requests: 2, lost: 0, timedOut: false, ...over,
  };
}

/** A run whose every step is `step(id, base, over)`. */
export function run(variant: Variant, n: number, base: number, over: Partial<StepMetrics> = {}, tier = 'medium'): RunResult {
  return { variant, run: n, tier, steps: IDS.map((id) => step(id, base, over)) };
}

/** A storage in memory, as the browser's `sessionStorage` and `localStorage` behave. */
export function memoryStorage(entries: Record<string, string> = {}): Storage {
  const kept = new Map(Object.entries(entries));
  return {
    get length() {
      return kept.size;
    },
    key: (i: number) => [...kept.keys()][i] ?? null,
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, String(value)),
    removeItem: (key: string) => void kept.delete(key),
    clear: () => kept.clear(),
  };
}

/** A finished one-run-each state. */
export function doneState(results: readonly RunResult[]): BenchState {
  return { v: 1, runs: 1, fast: false, order: ['A', 'B'], next: 2, results, header: HEADER };
}
