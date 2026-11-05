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

/** The benchmark's state across reloads (VENT-81): the order, the runs kept, what storage reads back and the phase. */
import { describe, expect, it } from 'vitest';
import { initialPhase } from '../src/bench/phase';
import { finished, readState, recordRun, runOrder, startState, STATE_KEY } from '../src/bench/run-state';
import { clearState, writeState } from '../src/bench/state-store';
import { HEADER, run } from './bench-factories';

/** A storage in memory, or one that refuses every write. */
function memory(refuse = false) {
  const kept = new Map<string, string>();
  return {
    kept,
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (refuse) throw new Error('quota');
      kept.set(key, value);
    },
    removeItem: (key: string) => void kept.delete(key),
  };
}

describe('the run order', () => {
  it('alternates A and B, as many times as the runs', () => {
    expect(runOrder(3)).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
    expect(runOrder(1)).toEqual(['A', 'B']);
  });
});

describe('recordRun', () => {
  it('keeps each run under its variant and number, and finishes after the last', () => {
    let state = startState(3, false);
    const steps = run('A', 1, 30).steps;
    for (let i = 0; i < 6; i++) {
      expect(finished(state)).toBe(false);
      state = recordRun(state, steps, HEADER);
    }
    expect(state.results.map((r) => `${r.variant}${r.run}`)).toEqual(['A1', 'B1', 'A2', 'B2', 'A3', 'B3']);
    expect(state.header).toEqual(HEADER);
    expect(finished(state)).toBe(true);
  });
});

describe('the kept state', () => {
  it('reads back what was written, and nothing once cleared', () => {
    const storage = memory();
    const state = startState(1, true);
    expect(writeState(storage, state)).toBe(true);
    expect(storage.kept.has(STATE_KEY)).toBe(true);
    expect(readState(storage)).toEqual(state);
    clearState(storage);
    expect(readState(storage)).toBeNull();
  });

  it('is no state when it does not read back, or the storage refuses', () => {
    const storage = memory();
    storage.kept.set(STATE_KEY, '{"v":2}');
    expect(readState(storage)).toBeNull();
    storage.kept.set(STATE_KEY, 'not json');
    expect(readState(storage)).toBeNull();
    expect(writeState(memory(true), startState(3, false))).toBe(false);
    expect(readState(null)).toBeNull();
  });
});

describe('the phase of a page load', () => {
  const options = { runs: 3 as const, fast: false, run: null };

  it('is the first state without a kept benchmark, with the address\'s run count', () => {
    expect(initialPhase(null, { ...options, runs: 1 })).toEqual({ kind: 'ready', runs: 1 });
  });

  it('is the running panel on the load the kept state names for its next run, and only that one', () => {
    const state = recordRun(startState(3, false), [], HEADER);
    expect(initialPhase(state, { ...options, run: 1 })).toEqual({ kind: 'running', state, step: 0 });
    expect(initialPhase(state, { ...options, run: 0 }).kind).toBe('ready');
    expect(initialPhase(state, options).kind).toBe('ready');
  });

  it('is the failed state once a run stopped on an error, whatever the address', () => {
    const state = { ...startState(3, false), error: 'run 1 (A): boom' };
    expect(initialPhase(state, { ...options, run: 0 })).toEqual({ kind: 'failed', state });
  });

  it('is the results once every run is kept', () => {
    let state = startState(1, false);
    state = recordRun(recordRun(state, [], HEADER), [], HEADER);
    expect(initialPhase(state, options)).toEqual({ kind: 'results', state });
  });
});
