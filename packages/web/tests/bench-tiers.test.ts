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
 * Every bench run starts from the device's tier and keeps the tier it ran at (VENT-81, Guardián round 1): a step-down
 * kept by one run must not lower the next, every reload of the benchmark is a departure on purpose (the on-foot view's
 * open mark cleared, as the language switch does), and runs at different tiers are said not to compare.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { leaveTo } from '../src/bench/leave';
import { endBench, nextLoad, startBench } from '../src/bench/navigate';
import { reportText } from '../src/bench/report';
import { tierSummary } from '../src/bench/results';
import { recordRun, startState } from '../src/bench/run-state';
import { doneState, HEADER, memoryStorage, run } from './bench-factories';

const TIER_KEY = 'ventana.onFootTier';
const OPEN_KEY = 'ventana.onFootOpen';

describe('each run\'s tier', () => {
  it('is kept with its run, from the header read in that run', () => {
    let state = startState(1, false);
    state = recordRun(state, [], { ...HEADER, tier: 'medium' });
    state = recordRun(state, [], { ...HEADER, tier: 'low' });
    expect(state.results.map((r) => `${r.variant}${r.run} ${r.tier}`)).toEqual(['A1 medium', 'B1 low']);
  });

  it('is listed per run, and runs at different tiers are said not to compare', () => {
    const mixed = [run('A', 1, 30, {}, 'medium'), run('B', 1, 30, {}, 'low')];
    expect(tierSummary(mixed)).toEqual({ list: 'A1 medium · B1 low', mixed: true });
    expect(tierSummary([run('A', 1, 30), run('B', 1, 30)])).toEqual({ list: 'A1 medium · B1 medium', mixed: false });
    const text = reportText(doneState(mixed));
    expect(text).toContain('View tier per run: A1 medium · B1 low');
    expect(text).toContain('Warning: the runs ran at different view tiers, so their figures do not compare.');
    expect(reportText(doneState([run('A', 1, 30), run('B', 1, 30)]))).not.toContain('Warning');
  });
});

describe('a run that stopped on an error', () => {
  it('puts the error in the report', () => {
    const state = { ...doneState([run('A', 1, 30)]), error: 'run 2 (B): no globe host' };
    expect(reportText(state)).toContain('Error: run 2 (B): no globe host');
  });
});

describe('leaving the page for the next bench load', () => {
  it('forgets the kept tier and marks the on-foot view closed on purpose, then replaces the address', () => {
    const session = memoryStorage({ [TIER_KEY]: 'low', [OPEN_KEY]: 'true' });
    const local = memoryStorage({ [OPEN_KEY]: JSON.stringify({ tab: Date.now() }) });
    const replace = vi.fn();
    leaveTo('/?bench&benchRun=1', { session, local, replace });
    expect(session.getItem(TIER_KEY)).toBeNull();
    expect(session.getItem(OPEN_KEY)).toBe('false');
    expect(replace).toHaveBeenCalledWith('/?bench&benchRun=1');
  });
});

describe('every bench reload leaves on purpose', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** The page as navigate.ts sees it: the address, its two storages and a recorded replace. */
  function page() {
    const session = memoryStorage({ [TIER_KEY]: 'low', [OPEN_KEY]: 'true' });
    const replace = vi.fn();
    vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('location', { pathname: '/', search: '?bench&benchRun=0', replace });
    return { session, replace };
  }

  it.each([
    ['Stop', () => endBench(false)],
    ['Close', () => endBench(true)],
    ['Start and Run again', () => startBench(3)],
    ['the next run', () => nextLoad(startState(3, false), [], HEADER)],
  ])('%s', (_name, go) => {
    const { session, replace } = page();
    go();
    expect(session.getItem(TIER_KEY)).toBeNull();
    expect(session.getItem(OPEN_KEY)).toBe('false');
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
