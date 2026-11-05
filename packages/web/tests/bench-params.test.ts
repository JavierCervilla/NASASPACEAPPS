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

/** The benchmark's address (VENT-81): `?bench`, its fixed instant, its options, the run addresses and when it loads. */
import { describe, expect, it, vi } from 'vitest';
import type { BenchModule } from '../src/lib/bench-loader';
import { loadBench } from '../src/lib/bench-loader';
import { BENCH_INSTANT_ISO, benchAsked, benchClock } from '../src/lib/bench-param';
import { benchOptions, plainHref, runHref } from '../src/bench/params';
import { localeHref } from '../src/i18n/switch';

const MODULE = {} as BenchModule;

describe('the ?bench parameter', () => {
  it('turns the benchmark on with any value, or none, and only that parameter', () => {
    expect(benchAsked('?bench')).toBe(true);
    expect(benchAsked('?site=im2-athena&bench=1')).toBe(true);
    expect(benchAsked('')).toBe(false);
    expect(benchAsked('?benchRuns=1')).toBe(false);
    expect(benchAsked('?site=bench')).toBe(false);
  });

  it('is kept by the language switch, like ?debug', () => {
    expect(localeHref('/', 'es', { search: '?bench&site=im2-athena&x=1', hash: '#globe' }))
      .toBe('/es/?site=im2-athena&bench=#globe');
  });
});

describe('benchClock', () => {
  it('stands still at 19 March 1967, noon UTC, under ?bench', () => {
    const clock = benchClock('?bench');
    expect(BENCH_INSTANT_ISO).toBe('1967-03-19T12:00:00Z');
    expect(clock?.()).toBe(Date.UTC(1967, 2, 19, 12));
    expect(clock?.()).toBe(clock?.());
  });

  it('is null without ?bench, so the page keeps the browser clock', () => {
    expect(benchClock('?debug')).toBeNull();
  });
});

describe('benchOptions', () => {
  it('defaults to 3 runs per variant, the full script, and no run', () => {
    expect(benchOptions('?bench')).toEqual({ runs: 3, fast: false, run: null });
  });

  it('reads benchRuns=1, benchFast and benchRun', () => {
    expect(benchOptions('?bench&benchRuns=1&benchFast&benchRun=2')).toEqual({ runs: 1, fast: true, run: 2 });
  });

  it('ignores a run that is no whole number from 0, and a run count other than 1 or 3', () => {
    expect(benchOptions('?bench&benchRun=-1&benchRuns=7')).toEqual({ runs: 3, fast: false, run: null });
    expect(benchOptions('?bench&benchRun=x').run).toBeNull();
  });
});

describe('the run addresses', () => {
  const where = { pathname: '/es/', search: '?bench&benchFast&site=artemis-malapert-massif&lat=-85&lon=40&debug' };

  it('opens run k at the start site, without the pin, keeping the other parameters', () => {
    const url = new URL(runHref(where, 3), 'https://x.test');
    expect(url.pathname).toBe('/es/');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      bench: '', benchFast: '', site: 'im2-athena', debug: '', benchRun: '3',
    });
  });

  it('opens the results without a run', () => {
    expect(new URL(runHref({ pathname: '/', search: '?bench&benchRun=1' }, null), 'https://x.test').searchParams.has('benchRun'))
      .toBe(false);
  });

  it('leaves the benchmark on «Close», keeping the rest', () => {
    expect(plainHref({ pathname: '/', search: '?bench&benchRuns=1&benchFast&benchRun=0&site=im2-athena' }))
      .toBe('/?site=im2-athena');
    expect(plainHref({ pathname: '/fr/', search: '?bench' })).toBe('/fr/');
  });
});

/** A host whose idle callbacks run only when the test says the page has started. */
function idleHost() {
  const waiting: (() => void)[] = [];
  return {
    host: {
      requestIdleCallback: (run: () => void) => waiting.push(run),
      cancelIdleCallback: vi.fn(),
      setTimeout: vi.fn(() => 0),
      clearTimeout: vi.fn(),
    },
    started: () => waiting.splice(0).forEach((run) => run()),
  };
}

describe('loadBench', () => {
  it('requests nothing without ?bench', () => {
    const load = vi.fn(async () => MODULE);
    expect(loadBench({ search: '?debug', host: idleHost().host, load })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('with ?bench, loads the chunk only once the page has started', async () => {
    const load = vi.fn(async () => MODULE);
    const { host, started } = idleHost();
    const bench = loadBench({ search: '?bench', host, load });
    expect(load).not.toHaveBeenCalled();
    started();
    expect(load).toHaveBeenCalledTimes(1);
    await expect(bench).resolves.toBe(MODULE);
  });
});
