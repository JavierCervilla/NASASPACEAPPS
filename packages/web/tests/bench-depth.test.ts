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

/** The benchmark's depth suite (VENT-104): `?bench=depth`, its run order, its run addresses and its script. */
import { describe, expect, it } from 'vitest';
import { DEPTH_SCRIPT_VERSION, depthScript, DEPTH_TURN_MS } from '../src/bench/depth-script';
import { depthOrder, variantParams } from '../src/bench/depth-suite';
import { benchOptions, plainHref, runHref } from '../src/bench/params';
import { recordRun, runOrder, startState } from '../src/bench/run-state';
import { HEADER, run } from './bench-factories';

const query = (href: string) => Object.fromEntries(new URL(href, 'https://x.test').searchParams);

describe('the depth suite in the address', () => {
  it('is asked by ?bench=depth, one round by default and three with benchRuns=3', () => {
    expect(benchOptions('?bench=depth')).toEqual({ suite: 'depth', runs: 1, fast: false, run: null });
    expect(benchOptions('?bench=depth&benchRuns=3&benchFast').runs).toBe(3);
    expect(benchOptions('?bench=Depth').suite).toBe('depth');
  });

  it('leaves every other value, or none, on the existing suite', () => {
    for (const search of ['?bench', '?bench=', '?bench=1', '?bench=deep', '?bench&depth=linear']) {
      expect(benchOptions(search).suite).toBeUndefined();
      expect(benchOptions(search).runs).toBe(3);
    }
  });
});

describe('the depth run order', () => {
  it('runs log against reversed without shadows first, then the forced shadow maps, the known loss last (VENT-107)', () => {
    expect(depthOrder(1)).toEqual(['split', 'log', 'reversed', 'reversed+shadows', 'linear+shadows', 'log+shadows']);
    expect(depthOrder(3)).toEqual([...depthOrder(1), ...depthOrder(1), ...depthOrder(1)]);
  });

  it('is the order of a new depth state, kept under its suite; the existing suite keeps A and B', () => {
    const state = startState(1, true, 'depth');
    expect(state).toMatchObject({ suite: 'depth', runs: 1, fast: true, next: 0, order: depthOrder(1) });
    expect(startState(3, false)).toEqual({ v: 1, runs: 3, fast: false, order: runOrder(3), next: 0, results: [], header: null });
  });

  it('keeps each run under its variant and round, with what it drew and its loss', () => {
    const depth = { drawn: 'reversed', bits: 24, reversed: true, shadowMap: true };
    let state = startState(1, false, 'depth');
    state = recordRun(state, run('split', 1, 30).steps, HEADER, { depth });
    state = recordRun(state, run('log', 1, 30).steps, HEADER, { depth, lostAt: { step: 'turnMinute', seconds: 3.2 } });
    expect(state.results.map((r) => `${r.variant}${r.run}`)).toEqual(['split1', 'log1']);
    expect(state.results[0]).toMatchObject({ depth });
    expect(state.results[0]?.lostAt).toBeUndefined();
    expect(state.results[1]?.lostAt).toEqual({ step: 'turnMinute', seconds: 3.2 });
  });
});

describe('the depth run addresses', () => {
  const where = { pathname: '/', search: '?bench=depth&benchFast&depth=linear&shadows=force&benchRun=2&lat=-85&lon=40' };

  it('asks each variant its own depth and shadow switches, and drops the last run\'s', () => {
    expect(variantParams('split')).toEqual([]);
    expect(variantParams('log')).toEqual([['depth', 'log']]);
    expect(variantParams('reversed')).toEqual([['depth', 'reversed']]);
    expect(variantParams('reversed+shadows')).toEqual([['depth', 'reversed'], ['shadows', 'force']]);
    expect(variantParams('linear+shadows')).toEqual([['depth', 'linear'], ['shadows', 'force']]);
    expect(variantParams('log+shadows')).toEqual([['depth', 'log'], ['shadows', 'force']]);
    expect(query(runHref(where, 1, 'reversed'))).toEqual({
      bench: 'depth', benchFast: '', site: 'im2-athena', benchRun: '1', depth: 'reversed',
    });
    expect(query(runHref(where, 2, 'reversed+shadows'))).toEqual({
      bench: 'depth', benchFast: '', site: 'im2-athena', benchRun: '2', depth: 'reversed', shadows: 'force',
    });
    expect(query(runHref(where, 0, 'split'))).toEqual({ bench: 'depth', benchFast: '', site: 'im2-athena', benchRun: '0' });
    expect(query(runHref(where, 3, 'log+shadows'))).toMatchObject({ shadows: 'force', depth: 'log' });
  });

  it('opens the results without any switch, and «Close» leaves them too', () => {
    expect(query(runHref(where, null, null))).toEqual({ bench: 'depth', benchFast: '', site: 'im2-athena' });
    expect(plainHref({ pathname: '/', search: '?bench=depth&depth=reversed&shadows=force&site=im2-athena&benchRun=1' }))
      .toBe('/?site=im2-athena');
  });

  it('leaves the existing suite\'s addresses as they were', () => {
    expect(query(runHref({ pathname: '/', search: '?bench&depth=linear' }, 0))).toEqual({
      bench: '', depth: 'linear', site: 'im2-athena', benchRun: '0',
    });
  });
});

describe('the depth script', () => {
  const script = depthScript(false);

  it('opens the 3D view at IM-2 and settles as step c does, then turns it for 60 s, with no globe step', () => {
    expect(DEPTH_SCRIPT_VERSION).toBe(1);
    expect(script.map((s) => s.id)).toEqual(['openView', 'turnMinute']);
    expect(script[0]?.actions).toEqual([{ kind: 'view', view: 'horizon' }, { kind: 'settle', timeoutMs: 60_000, park: false }]);
    expect(DEPTH_TURN_MS).toBe(60_000);
    expect(script[1]?.actions).toEqual([{ kind: 'keysFor', target: 'onFoot', key: 'ArrowRight', gapMs: 16, ms: 60_000 }]);
  });

  it('scales the turn to a fifth with benchFast, the same keys and settle timeout', () => {
    const fast = depthScript(true);
    expect(fast[0]?.actions).toEqual(script[0]?.actions);
    expect(fast[1]?.actions).toEqual([{ kind: 'keysFor', target: 'onFoot', key: 'ArrowRight', gapMs: 16, ms: 12_000 }]);
  });
});
