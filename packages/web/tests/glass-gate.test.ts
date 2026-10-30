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

/** The glass gate (VENT-27): Liquid or frosted, each condition, the forced mode, the frame probe and its memory. */
import { describe, expect, it } from 'vitest';
import { BUDGET_SLACK, PROBE_MS, WARMUP_MS, overBudget, p90, probeFrames } from '../src/glass/frame-probe';
import { chooseGlass, chromiumEngine, forcedGlass, type GlassEnv } from '../src/glass/glass-gate';
import { keepFrosted, keptGlass, type GlassStorage } from '../src/glass/glass-memory';
import { startGlass, type GlassDeps, type MediaWatch } from '../src/glass/glass-start';
import { settingsFor, type Tier } from '../src/lib/quality';

/** A capable desktop: Chromium, refraction, the high tier, nothing asked for. */
const CAPABLE: GlassEnv = {
  search: '',
  kept: null,
  chromium: true,
  refracts: true,
  saveData: false,
  reducedTransparency: false,
  moreContrast: false,
  tier: () => 'high',
};

describe('glass choice', () => {
  it('chooses Liquid, on trial, only when every condition holds', () => {
    expect(chooseGlass(CAPABLE)).toEqual({ mode: 'liquid', reason: 'capable', probe: true });
    expect(chooseGlass({ ...CAPABLE, tier: () => 'medium' }).mode).toBe('liquid');
  });

  it.each([
    ['no Chromium engine (Safari, Firefox)', { chromium: false }, 'no-refraction'],
    ['no backdrop-filter: url()', { refracts: false }, 'no-refraction'],
    ['Save-Data', { saveData: true }, 'save-data'],
    ['prefers-reduced-transparency', { reducedTransparency: true }, 'reduced-transparency'],
    ['prefers-contrast: more', { moreContrast: true }, 'more-contrast'],
    ['the low tier', { tier: (): Tier => 'low' }, 'low-tier'],
    ['a failed probe earlier this session', { kept: 'frosted' as const }, 'kept'],
  ])('falls back to frosted with %s', (_, change, reason) => {
    expect(chooseGlass({ ...CAPABLE, ...change })).toEqual({ mode: 'frosted', reason, probe: false });
  });

  it('never probes the GPU for the tier when a cheaper rule already decided', () => {
    let asked = 0;
    const tier = (): Tier => ((asked += 1), 'high');
    chooseGlass({ ...CAPABLE, saveData: true, tier });
    chooseGlass({ ...CAPABLE, chromium: false, tier });
    expect(asked).toBe(0);
  });

  it('lets ?glass= force a mode, over every condition, with no trial', () => {
    expect(forcedGlass('?glass=liquid')).toBe('liquid');
    expect(forcedGlass('?quality=high&glass=frosted')).toBe('frosted');
    expect(forcedGlass('?glass=solid')).toBeNull();
    const weak = { ...CAPABLE, chromium: false, reducedTransparency: true, kept: 'frosted' as const };
    expect(chooseGlass({ ...weak, search: '?glass=liquid' })).toEqual({ mode: 'liquid', reason: 'forced', probe: false });
    expect(chooseGlass({ ...CAPABLE, search: '?glass=frosted' })).toEqual({ mode: 'frosted', reason: 'forced', probe: false });
  });

  it('knows Chromium by its brand, and nothing else for it', () => {
    expect(chromiumEngine([{ brand: 'Brave' }, { brand: 'Chromium' }, { brand: 'Not=A?Brand' }])).toBe(true);
    expect(chromiumEngine([{ brand: 'Not=A?Brand' }])).toBe(false);
    expect(chromiumEngine(undefined)).toBe(false);
  });
});

/** A frame scheduler whose frames each take `ms`, on a fake clock. */
function frames(ms: number) {
  const clock = { t: 0 };
  const queue: (() => void)[] = [];
  return {
    now: () => clock.t,
    frame: (fn: () => void) => queue.push(fn),
    /** Runs frames until none is asked for. */
    run(): void {
      for (let fn = queue.shift(); fn; fn = queue.shift()) {
        clock.t += ms;
        fn();
      }
    },
  };
}

describe('frame probe', () => {
  it('takes the 90th percentile and gives the budget its slack', () => {
    expect(p90([])).toBe(0);
    expect(p90([10, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(9);
    expect(overBudget(16.7, 60)).toBe(false);
    expect(overBudget((1000 / 60) * BUDGET_SLACK + 0.1, 60)).toBe(true);
    expect(overBudget(30, 45)).toBe(true);
  });

  it('holds at 60 fps and fails at 20 fps on the high tier, timing only after the warm-up', () => {
    const results: [boolean, number][] = [];
    for (const ms of [1000 / 60, 50]) {
      const fake = frames(ms);
      probeFrames({ ...fake, targetFps: 60 }, (holds, p) => results.push([holds, p]));
      fake.run();
      expect(fake.now()).toBeGreaterThanOrEqual(WARMUP_MS + PROBE_MS);
      expect(fake.now()).toBeLessThan(WARMUP_MS + PROBE_MS + ms + 1);
    }
    expect(results.map(([holds]) => holds)).toEqual([true, false]);
    expect(results[1]?.[1]).toBe(50);
  });

  it('forgives a few slow frames (a texture upload), not a slow tenth', () => {
    /** The verdict when every `every`-th frame takes 100 ms and the rest 16 ms. */
    const verdict = (every: number): boolean => {
      const clock = { t: 0, n: 0 };
      const queue: (() => void)[] = [];
      let result: boolean | null = null;
      const deps = { now: () => clock.t, frame: (fn: () => void) => queue.push(fn), targetFps: 60 };
      probeFrames(deps, (holds) => (result = holds));
      for (let fn = queue.shift(); fn; fn = queue.shift()) {
        clock.n += 1;
        clock.t += clock.n % every === 0 ? 100 : 16;
        fn();
      }
      return result ?? false;
    };
    expect(verdict(30)).toBe(true);
    expect(verdict(5)).toBe(false);
  });
});

/** In-memory session storage; `broken` throws on every call, as a refused storage does. */
function storage(broken = false): GlassStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const guard = (): void => {
    if (broken) throw new Error('SecurityError');
  };
  return {
    data,
    getItem: (key) => (guard(), data.get(key) ?? null),
    setItem: (key, value) => (guard(), void data.set(key, value)),
  };
}

/** A media query whose answer the test changes. */
function media(matches = false): MediaWatch & { set(value: boolean): void } {
  const listeners: (() => void)[] = [];
  const watch = {
    matches,
    addEventListener: (_: 'change', fn: () => void) => void listeners.push(fn),
    set(value: boolean) {
      watch.matches = value;
      for (const fn of listeners) fn();
    },
  };
  return watch;
}

/** startGlass on a capable desktop, with frames of `ms` and every dependency in hand. */
function page(ms: number, change: Partial<GlassDeps> = {}) {
  const fake = frames(ms);
  const attrs: string[] = [];
  const queries = { transparency: media(), contrast: media() };
  const deps: GlassDeps = {
    root: { setAttribute: (_, value) => void attrs.push(value) },
    search: '',
    storage: storage(),
    chromium: true,
    supports: (property, value) => property === 'backdrop-filter' && value === 'url(#x)',
    media: (query) => (query.includes('transparency') ? queries.transparency : queries.contrast),
    saveData: false,
    quality: () => settingsFor('high'),
    frame: fake.frame,
    now: fake.now,
    firstInput: (fn) => void inputs.push(fn),
    ...change,
  };
  const inputs: (() => void)[] = [];
  /** The visitor's first press: the second trial starts. */
  const press = (): void => inputs.shift()?.();
  return { deps, attrs, queries, run: fake.run, press, choice: () => startGlass(deps) };
}

describe('glass gate on a page', () => {
  it('sets Liquid, keeps it when the frames hold, and keeps nothing', () => {
    const p = page(1000 / 60);
    expect(p.choice().mode).toBe('liquid');
    p.run();
    expect(p.attrs).toEqual(['liquid']);
    expect((p.deps.storage as ReturnType<typeof storage>).data.size).toBe(0);
  });

  it('switches to frosted live when the frames are slow, and the next load stays frosted with no trial', () => {
    const p = page(50);
    p.choice();
    expect(p.attrs).toEqual(['liquid']);
    p.run();
    expect(p.attrs).toEqual(['liquid', 'frosted']);
    const again = page(1000 / 60, { storage: p.deps.storage });
    expect(again.choice()).toEqual({ mode: 'frosted', reason: 'kept', probe: false });
    again.run();
    expect(again.attrs).toEqual(['frosted']);
  });

  it('times the frames again from the first press: a GPU that only struggles once the globe moves loses Liquid', () => {
    const clock = { t: 0, ms: 1000 / 60 };
    const queue: (() => void)[] = [];
    const run = (): void => {
      for (let fn = queue.shift(); fn; fn = queue.shift()) {
        clock.t += clock.ms;
        fn();
      }
    };
    const p = page(0, { frame: (fn) => queue.push(fn), now: () => clock.t });
    p.choice();
    run();
    expect(p.attrs).toEqual(['liquid']);
    // The visitor drags: the globe turns under the glass and every frame now takes 60 ms.
    clock.ms = 60;
    p.press();
    run();
    expect(p.attrs).toEqual(['liquid', 'frosted']);
    // Only the first press starts a trial.
    p.press();
    expect(queue).toEqual([]);
  });

  it('holds the budget of the tier: 25 ms frames fail the high tier, pass the medium one', () => {
    const high = page(25);
    high.choice();
    high.run();
    const medium = page(25, { quality: () => settingsFor('medium') });
    medium.choice();
    medium.run();
    expect([high.attrs.at(-1), medium.attrs.at(-1)]).toEqual(['frosted', 'liquid']);
  });

  it('survives a storage that throws: frosted after a slow trial, and a new trial next time', () => {
    const broken = storage(true);
    const p = page(50, { storage: broken });
    p.choice();
    p.run();
    expect(p.attrs.at(-1)).toBe('frosted');
    expect(keptGlass(broken)).toBeNull();
    expect(() => keepFrosted(broken)).not.toThrow();
    expect(page(50, { storage: broken }).choice().mode).toBe('liquid');
    expect(page(50, { storage: null }).choice().mode).toBe('liquid');
  });

  it('drops to frosted live when the visitor asks for less transparency or more contrast', () => {
    for (const which of ['transparency', 'contrast'] as const) {
      const p = page(1000 / 60);
      p.choice();
      p.queries[which].set(true);
      expect(p.attrs).toEqual(['liquid', 'frosted']);
    }
  });

  it('reads the settings, the support test and the forced mode at load', () => {
    const asked: string[] = [];
    const unsupported = page(16, { supports: (p, v) => (asked.push(`${p}: ${v}`), false) });
    expect(unsupported.choice().reason).toBe('no-refraction');
    expect(asked).toEqual(['backdrop-filter: url(#x)']);
    const p = page(16);
    p.queries.contrast.set(true);
    expect(p.choice().reason).toBe('more-contrast');
    const forced = page(50, { search: '?glass=liquid', chromium: false });
    expect(forced.choice().reason).toBe('forced');
    forced.run();
    expect(forced.attrs).toEqual(['liquid']);
  });
});
