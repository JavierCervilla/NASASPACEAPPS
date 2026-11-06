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

/** The depth suite's results and report (VENT-104): a row per run, and the plain-English report. */
import { describe, expect, it } from 'vitest';
import { depthRows } from '../src/bench/depth-results';
import { logVersusReversed } from '../src/bench/depth-versus';
import { benchReport } from '../src/bench/depth-report';
import { reportText } from '../src/bench/report';
import { depthOrder } from '../src/bench/depth-suite';
import type { BenchState, RunResult } from '../src/bench/types';
import { doneState, HEADER, run, step } from './bench-factories';

const LOG = { drawn: 'log', bits: 24, reversed: false, shadowMap: false };
const REVERSED = { drawn: 'reversed', bits: 24, reversed: true, shadowMap: true };

/** A depth run: its open step, then its turn at `fps`, unless it was lost while opening. */
function depthRun(variant: RunResult['variant'], n: number, fps: number, extra: Partial<RunResult> = {}): RunResult {
  const lostOpening = extra.lostAt?.step === 'openView';
  const steps = [step('openView', 20), ...(lostOpening ? [] : [step('turnMinute', fps)])];
  return { variant, run: n, tier: 'medium', steps, depth: LOG, ...extra };
}

const RESULTS = [
  depthRun('log', 1, 50),
  depthRun('reversed', 1, 40, { depth: { ...REVERSED, shadowMap: false } }),
  depthRun('reversed+shadows', 1, 40, { depth: REVERSED }),
  depthRun('linear+shadows', 1, 45, { depth: { ...REVERSED, drawn: 'linear', reversed: false } }),
  depthRun('log+shadows', 1, 25, { depth: { ...LOG, shadowMap: true }, lostAt: { step: 'turnMinute', seconds: 3.24 } }),
];

const depthState = (results: readonly RunResult[]): BenchState => ({
  v: 1, suite: 'depth', runs: 1, fast: true, order: depthOrder(1), next: 5, results, header: HEADER,
});

describe('depthRows', () => {
  it('gives one row per run: survived or lost, what it drew, and the turn\'s frames', () => {
    const rows = depthRows(RESULTS);
    expect(rows.map((r) => r.name)).toEqual(['log', 'reversed', 'reversed+shadows', 'linear+shadows', 'log+shadows']);
    expect(rows[2]).toEqual({ name: 'reversed+shadows', lostAt: null, depth: REVERSED, fps: 40, p95: 25, worst: 50 });
    expect(rows[4]?.lostAt).toEqual({ step: 'turnMinute', seconds: 3.24 });
  });

  it('names each run by its round when there are more, and has no frames for a run lost while opening', () => {
    const rows = depthRows([...RESULTS, depthRun('log', 2, 50, { lostAt: { step: 'openView', seconds: 1 } })]);
    expect(rows.map((r) => r.name).slice(0, 2)).toEqual(['log 1', 'reversed 1']);
    expect(rows[5]).toMatchObject({ name: 'log 2', fps: null, p95: null, worst: null });
  });

  it('says nothing it was not told: an old run has no depth', () => {
    const { variant, run: n, tier, steps } = depthRun('log', 1, 50);
    expect(depthRows([{ variant, run: n, tier, steps }])[0]?.depth).toBeNull();
  });
});

describe('logVersusReversed (VENT-107)', () => {
  it('sets the turn of log against reversed, both without a forced shadow map', () => {
    expect(logVersusReversed(RESULTS)).toEqual({
      log: { fps: 50, p95: 20, worst: 40 },
      reversed: { fps: 40, p95: 25, worst: 50 },
    });
  });

  it('takes the median over the rounds, and n/a for a variant with no turn', () => {
    const rounds = [
      depthRun('log', 1, 50), depthRun('log', 2, 40), depthRun('log', 3, 20),
      depthRun('reversed', 1, 40, { lostAt: { step: 'openView', seconds: 1 } }),
    ];
    expect(logVersusReversed(rounds)).toEqual({
      log: { fps: 40, p95: 25, worst: 50 },
      reversed: { fps: null, p95: null, worst: null },
    });
  });
});

describe('the depth report', () => {
  const report = benchReport(depthState(RESULTS));

  it('keeps the header the benchmark writes', () => {
    expect(report).toContain('Ventana Lunar benchmark report');
    expect(report).toContain(`GPU: ${HEADER.gpu}`);
    expect(report).toContain('View tier per run: log1 medium · reversed1 medium · reversed+shadows1 medium · linear+shadows1 medium · log+shadows1 medium');
    expect(report).toContain('Suite: depth (script v1). Runs: 1 round, order log reversed reversed+shadows linear+shadows log+shadows (fast script)');
  });

  it('lists every run as its row says, then every step', () => {
    expect(report).toContain('log: survived · depth log · 24 bits · reversed buffer no · shadow map off'
      + ' · fps 50 · p95Ms 20 · worstMs 40');
    expect(report).toContain('log+shadows: lost after 3.2 s of the turn · depth log · 24 bits · reversed buffer no'
      + ' · shadow map on · fps 25 · p95Ms 40 · worstMs 80');
    expect(report).toMatch(/^reversed1 turnMinute: ms=4000 fps=40 /m);
  });

  it('opens its runs with log against reversed, no shadow map (VENT-107)', () => {
    expect(report).toContain('log vs reversed, no shadow map: fps 50 vs 40 · p95Ms 20 vs 25 · worstMs 40 vs 50');
    expect(report.indexOf('log vs reversed')).toBeLessThan(report.indexOf('Every run'));
  });

  it('says a loss while opening, and n/a for what it could not read', () => {
    const lost = depthRun('log', 1, 50, { lostAt: { step: 'openView', seconds: 1.04 },
      depth: { drawn: 'log', bits: null, reversed: null, shadowMap: null } });
    expect(benchReport(depthState([lost]))).toContain('log: lost after 1 s of opening · depth log · n/a bits'
      + ' · reversed buffer n/a · shadow map n/a · fps n/a · p95Ms n/a · worstMs n/a');
  });

  it('leaves the existing suite\'s report as it was', () => {
    const state = doneState([run('A', 1, 30), run('B', 1, 45)]);
    expect(benchReport(state)).toBe(reportText(state));
  });
});
