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
 * The on-foot view's crash report (VENT-49): a bounded trail of what the
 * view did since it mounted, kept in memory and in the session's storage so
 * a reload after a GPU restart still has the last run, and the plain text a
 * person can copy from the lost state. A storage that throws costs only the
 * memory of the run, never the view.
 */
import { describe, expect, it } from 'vitest';
import type { Environment } from '../src/terrain/report/environment';
import { createRecorder, type RecorderDeps } from '../src/terrain/report/recorder';
import { reportText } from '../src/terrain/report/report-text';
import { readRuns, REPORT_KEY, writeRuns, type ReportStorage, type Runs } from '../src/terrain/report/run-store';
import { addFrame, addStep, MAX_FRAMES, MAX_STEPS, startRun, type Run } from '../src/terrain/report/trail';

const ENV: Environment = {
  tier: 'medium',
  leftOut: '',
  page: '/?lat=-85.50&lon=40.00#horizon',
  userAgent: 'Mozilla/5.0 (Linux; Android 17; Pixel 10) Chrome/156',
  gpu: 'PowerVR D-Series',
  pixelRatio: 2.625,
  viewport: '412x915',
  threads: 8,
  deviceMemoryGb: 8,
  battery: '14%, not charging',
};

const STARTED = '2026-11-02T23:38:01.000Z';
const step = (t: number, text: string, repeat: string | null = null) => ({ t, text, repeat });

/** `run` with `n` steps named `step 0` to `step n-1`. */
function runOf(n: number): Run {
  let run = startRun(STARTED, ENV);
  for (let i = 0; i < n; i++) run = addStep(run, step(i, `step ${i}`));
  return run;
}

/** In-memory session storage; `broken` throws on every call, as a refused storage does. */
function storage(broken = false, items: Record<string, string> = {}): ReportStorage & { items: Map<string, string> } {
  const kept = new Map(Object.entries(items));
  const refuse = (): never => {
    throw new Error('storage refused');
  };
  return {
    items: kept,
    getItem: broken ? refuse : (key) => kept.get(key) ?? null,
    setItem: broken ? refuse : (key, value) => void kept.set(key, value),
  };
}

describe('the trail', () => {
  it('keeps at most 40 steps, the newest, in the order they happened', () => {
    const run = runOf(MAX_STEPS + 10);
    expect(run.steps).toHaveLength(MAX_STEPS);
    expect(run.steps[0]?.text).toBe('step 10');
    expect(run.steps.at(-1)?.text).toBe(`step ${MAX_STEPS + 9}`);
    expect(run.steps.map((s) => s.t)).toEqual([...run.steps.map((s) => s.t)].sort((a, b) => a - b));
    expect(run.dropped).toBe(10);
  });

  it('keeps everything under the bound', () => {
    const run = runOf(MAX_STEPS);
    expect(run.steps).toHaveLength(MAX_STEPS);
    expect(run.dropped).toBe(0);
  });

  it('folds consecutive steps with one repeat key into one that counts them', () => {
    let run = startRun(STARTED, ENV);
    run = addStep(run, step(1, 'instant skipped (0.01)', 'skip'));
    run = addStep(run, step(2, 'instant skipped (0.02)', 'skip'));
    run = addStep(run, step(3, 'instant skipped (0.03)', 'skip'));
    expect(run.steps).toEqual([{ t: 3, text: 'instant skipped (0.03)', repeat: 'skip', count: 3 }]);
    run = addStep(run, step(4, 'relight', 'relight'));
    run = addStep(run, step(5, 'instant skipped (0.01)', 'skip'));
    expect(run.steps.map((s) => [s.text, s.count])).toEqual([
      ['instant skipped (0.03)', 3],
      ['relight', 1],
      ['instant skipped (0.01)', 1],
    ]);
  });

  it('does not fold steps with no repeat key, even when their text is the same', () => {
    let run = addStep(startRun(STARTED, ENV), step(1, 'same'));
    run = addStep(run, step(2, 'same'));
    expect(run.steps).toHaveLength(2);
  });

  it('keeps the last 8 frames, oldest first', () => {
    let run = startRun(STARTED, ENV);
    for (let i = 0; i < MAX_FRAMES + 4; i++) {
      run = addFrame(run, { t: i, calls: 43, triangles: 1000 + i, drawMs: 1.5, canvas: '100x50' });
    }
    expect(run.frames).toHaveLength(MAX_FRAMES);
    expect(run.frames[0]?.triangles).toBe(1004);
    expect(run.frames.at(-1)?.triangles).toBe(1011);
  });

  it('never changes the run it was given', () => {
    const run = runOf(2);
    addStep(run, step(9, 'later'));
    addFrame(run, { t: 9, calls: 1, triangles: 1, drawMs: 1, canvas: '1x1' });
    expect(run.steps).toHaveLength(2);
    expect(run.frames).toHaveLength(0);
  });
});

describe('the stored runs', () => {
  it('keeps the current run and the previous one, as they were', () => {
    const kept = storage();
    const runs: Runs = { current: runOf(3), previous: runOf(2) };
    writeRuns(kept, runs);
    expect(kept.items.has(REPORT_KEY)).toBe(true);
    expect(readRuns(kept)).toEqual(runs);
  });

  it('is empty for a missing storage, a missing key, broken JSON and another shape', () => {
    expect(readRuns(null)).toEqual({ current: null, previous: null });
    expect(readRuns(storage())).toEqual({ current: null, previous: null });
    expect(readRuns(storage(false, { [REPORT_KEY]: '{not json' }))).toEqual({ current: null, previous: null });
    expect(readRuns(storage(false, { [REPORT_KEY]: '[1,2]' }))).toEqual({ current: null, previous: null });
    expect(readRuns(storage(false, { [REPORT_KEY]: '{"v":99,"current":{}}' }))).toEqual({ current: null, previous: null });
  });

  it('drops a run that is not one and keeps the other', () => {
    const good = runOf(2);
    const kept = storage(false, { [REPORT_KEY]: JSON.stringify({ v: 1, current: { steps: 'x' }, previous: good }) });
    expect(readRuns(kept)).toEqual({ current: null, previous: good });
  });

  it('drops the steps that are not steps, and the frames that are not frames', () => {
    const run = runOf(2);
    const broken = { ...run, steps: [...run.steps, { t: 'x' }, null], frames: [{ t: 1 }] };
    const kept = storage(false, { [REPORT_KEY]: JSON.stringify({ v: 1, current: broken, previous: null }) });
    expect(readRuns(kept).current?.steps).toEqual(run.steps);
    expect(readRuns(kept).current?.frames).toEqual([]);
  });

  it('never throws on a storage that refuses to read or to write', () => {
    expect(readRuns(storage(true))).toEqual({ current: null, previous: null });
    expect(() => writeRuns(storage(true), { current: runOf(1), previous: null })).not.toThrow();
  });
});

describe('the report text', () => {
  const run: Run = {
    ...runOf(0),
    steps: [
      { t: 0, text: 'mount at tier medium', repeat: null, count: 1 },
      { t: 12.34, text: 'instant skipped (Sun 0.008 deg)', repeat: 'skip', count: 3 },
      { t: 63.2, text: 'context lost: "GPU process crashed"', repeat: null, count: 1 },
    ],
    dropped: 4,
    frames: [{ t: 58.1, calls: 43, triangles: 304_012, drawMs: 12.4, canvas: '1080x2400' }],
    memory: { geometries: 52, textures: 6 },
  };

  it('says what happened, in order, in plain text, from a fixed trail', () => {
    const text = reportText({ current: run, previous: null }, '2026-11-02T23:40:12.000Z');
    expect(text).toBe([
      'Ventana Lunar on-foot view report',
      'Made at 2026-11-02T23:40:12.000Z',
      '',
      'This run, started 2026-11-02T23:38:01.000Z',
      'Tier: medium',
      'Left out (?onfoot=): none',
      'Page: /?lat=-85.50&lon=40.00#horizon',
      'User agent: Mozilla/5.0 (Linux; Android 17; Pixel 10) Chrome/156',
      'GPU: PowerVR D-Series',
      'Pixel ratio: 2.625',
      'Viewport: 412x915',
      'Canvas: 1080x2400',
      'CPU threads: 8',
      'Device memory: 8 GB',
      'Battery: 14%, not charging',
      'GPU memory: 52 geometries, 6 textures',
      '',
      'Steps, in seconds since the view mounted (4 earlier steps dropped)',
      '  0.0 mount at tier medium',
      '  12.3 instant skipped (Sun 0.008 deg) (x3)',
      '  63.2 context lost: "GPU process crashed"',
      '',
      'Last frames: seconds, draw calls, triangles, draw ms',
      '  58.1 43 304012 12.4',
    ].join('\n'));
  });

  it('names what it does not know, and the parts left out', () => {
    const bare: Run = { ...startRun(STARTED, { ...ENV, leftOut: 'shadows,far', gpu: null, threads: null,
      deviceMemoryGb: null, battery: null }) };
    const text = reportText({ current: bare, previous: null }, STARTED);
    expect(text).toContain('Left out (?onfoot=): shadows,far');
    expect(text).toContain('GPU: unknown');
    expect(text).toContain('Canvas: unknown');
    expect(text).toContain('CPU threads: unknown');
    expect(text).toContain('Device memory: unknown');
    expect(text).toContain('Battery: unknown');
    expect(text).not.toContain('GPU memory');
    expect(text).toContain('  (no steps)');
    expect(text).toContain('  (no frames drawn)');
  });

  it('adds the previous run after this one, and says when there is none', () => {
    const both = reportText({ current: runOf(1), previous: { ...runOf(1), startedAt: '2026-11-02T23:00:00.000Z' } }, STARTED);
    expect(both.indexOf('This run, started')).toBeLessThan(both.indexOf('Previous run, started 2026-11-02T23:00:00.000Z'));
    expect(reportText({ current: runOf(1), previous: null }, STARTED)).not.toContain('Previous run');
    expect(reportText({ current: null, previous: null }, STARTED)).toContain('No run was recorded');
  });
});

/** A recorder over fakes: a clock in ms, a wall clock, storage, and an environment read. */
function recorder(overrides: Partial<RecorderDeps> & { kept?: ReportStorage | null } = {}) {
  const clock = { ms: 1000 };
  const batteryHearers: ((text: string) => void)[] = [];
  const kept = overrides.kept === undefined ? storage() : overrides.kept;
  const deps: RecorderDeps = {
    storage: () => kept,
    now: () => clock.ms,
    date: () => new Date(STARTED),
    environment: (mount) => ({ ...ENV, ...mount, battery: null }),
    battery: (hear) => void batteryHearers.push(hear),
    ...overrides,
  };
  return { clock, kept, batteryHearers, report: createRecorder(deps) };
}

describe('the recorder', () => {
  it('starts a run with the mount step at zero seconds, and counts seconds from it', () => {
    const { clock, report } = recorder();
    report.begin({ tier: 'low', leftOut: 'shade' });
    clock.ms += 2500;
    report.step('stage created');
    const text = report.text();
    expect(text).toContain('Tier: low');
    expect(text).toContain('Left out (?onfoot=): shade');
    expect(text).toContain('  0.0 mount at tier low, left out: shade');
    expect(text).toContain('  2.5 stage created');
  });

  it('writes the run to the session storage with each step', () => {
    const { clock, kept, report } = recorder();
    report.begin({ tier: 'medium', leftOut: '' });
    clock.ms += 1000;
    report.step('stage created');
    const stored = readRuns(kept);
    expect(stored.current?.steps.map((s) => s.text)).toEqual(['mount at tier medium', 'stage created']);
  });

  it('keeps frames and memory in memory, and stores them with the next step', () => {
    const { clock, kept, report } = recorder();
    report.begin({ tier: 'medium', leftOut: '' });
    report.frame({ calls: 43, triangles: 304_012, drawMs: 12.4, canvas: '1080x2400' });
    report.memory({ geometries: 52, textures: 6 });
    expect(readRuns(kept).current?.frames).toEqual([]);
    expect(report.text()).toContain('  0.0 43 304012 12.4');
    expect(report.text()).toContain('GPU memory: 52 geometries, 6 textures');
    clock.ms += 1000;
    report.step('relight');
    expect(readRuns(kept).current?.frames).toHaveLength(1);
    expect(readRuns(kept).current?.memory).toEqual({ geometries: 52, textures: 6 });
  });

  it('keeps the previous run when a new one begins, and drops the one before', () => {
    const { report } = recorder();
    report.begin({ tier: 'high', leftOut: '' });
    report.step('first run step');
    report.begin({ tier: 'medium', leftOut: '' });
    report.step('second run step');
    report.begin({ tier: 'low', leftOut: '' });
    const text = report.text();
    expect(text).toContain('Tier: low');
    expect(text).toContain('Previous run');
    expect(text).toContain('second run step');
    expect(text).not.toContain('first run step');
  });

  it('finds the last run of the page before a reload as the previous one', () => {
    const kept = storage();
    const first = recorder({ kept }).report;
    first.begin({ tier: 'medium', leftOut: '' });
    first.step('context lost: "crashed"');
    const reloaded = recorder({ kept }).report;
    expect(reloaded.text()).toContain('Previous run');
    reloaded.begin({ tier: 'low', leftOut: '' });
    const text = reloaded.text();
    expect(text).toContain('Tier: low');
    expect(text).toContain('Previous run');
    expect(text).toContain('context lost: "crashed"');
  });

  it('folds repeating steps', () => {
    const { report } = recorder();
    report.begin({ tier: 'medium', leftOut: '' });
    report.step('instant skipped', 'skip');
    report.step('instant skipped', 'skip');
    expect(report.text()).toContain('instant skipped (x2)');
  });

  it('keeps working in memory when the storage refuses everything', () => {
    const { report } = recorder({ kept: storage(true) });
    expect(() => {
      report.begin({ tier: 'medium', leftOut: '' });
      report.step('stage created');
    }).not.toThrow();
    expect(report.text()).toContain('stage created');
    const none = recorder({ kept: null }).report;
    none.begin({ tier: 'medium', leftOut: '' });
    expect(none.text()).toContain('mount at tier medium');
  });

  it('takes the environment as it comes: the GPU from the scene, the battery when it answers', () => {
    const { batteryHearers, report } = recorder();
    report.begin({ tier: 'medium', leftOut: '' });
    expect(report.text()).toContain('Battery: unknown');
    report.environment({ gpu: 'Mali-G715' });
    batteryHearers[0]?.('9%, charging');
    const text = report.text();
    expect(text).toContain('GPU: Mali-G715');
    expect(text).toContain('Battery: 9%, charging');
  });

  it('ignores a battery that answers after a newer run began', () => {
    const { batteryHearers, report } = recorder();
    report.begin({ tier: 'high', leftOut: '' });
    report.begin({ tier: 'low', leftOut: '' });
    batteryHearers[0]?.('1%, not charging');
    expect(report.text()).not.toContain('Battery: 1%, not charging');
  });

  it('says there was no run when nothing mounted and nothing was stored', () => {
    expect(recorder().report.text()).toContain('No run was recorded');
  });

  it('records nothing before a run begins, and never throws', () => {
    const { report } = recorder();
    expect(() => {
      report.step('too early');
      report.frame({ calls: 1, triangles: 1, drawMs: 1, canvas: '1x1' });
      report.memory({ geometries: 1, textures: 1 });
      report.environment({ gpu: 'x' });
    }).not.toThrow();
    expect(report.text()).not.toContain('too early');
  });
});
