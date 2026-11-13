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
 * The globe's Moon maps under `?debug` (VENT-99): every step of the swapper is a line in the dev tools' breadcrumbs
 * (asked, landed with its seconds and size, failed with what the browser said, timed out, on the Moon, lowered), and a
 * map load that never settles fails after a bound, so a hung 4K never keeps the swapper busy for good.
 */
import { describe, expect, it, vi } from 'vitest';
import { mapCrumbs, pixelSize } from '../src/globe/map-crumbs';
import { glErrorName } from '../src/globe/map-failure';
import { mapLine, type MapEvent } from '../src/globe/map-trace';
import { ruleWatch } from '../src/globe/moon-swap';
import type { SwapDeps } from '../src/globe/texture-fetch';
import { MAP_TIMEOUT_MS, type LoadClock } from '../src/globe/texture-load';
import { levelUrls, type LodCaps, type LodLevel } from '../src/globe/texture-lod';
import { TextureSwap } from '../src/globe/texture-swap';

interface Fake {
  readonly url: string;
}

/** A clock whose time and timers move only when the test says. */
function fakeClock() {
  let now = 0;
  let next = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: LoadClock = {
    now: () => now,
    after: (ms, fn) => {
      const id = ++next;
      timers.set(id, { at: now + ms, fn });
      return () => void timers.delete(id);
    },
  };
  const advance = (ms: number): void => {
    now += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at > now) continue;
      timers.delete(id);
      timer.fn();
    }
  };
  return { clock, advance, timers };
}

const name = (url: string): string => url.replace(/^.*moon-/, '').replace('.jpg', '');
const flush = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

/** A swapper whose loads wait to be answered one by one, with a fake clock and its trace as text. */
function setUp(uploadThrows?: string) {
  const log: string[] = [];
  const lines: string[] = [];
  const pending = new Map<string, { resolve: (t: Fake) => void; reject: (e: unknown) => void }>();
  const time = fakeClock();
  const deps: SwapDeps<Fake> = {
    urls: (level: LodLevel) => levelUrls(level, '/'),
    load: (url) => {
      log.push(`load ${name(url)}`);
      return new Promise((resolve, reject) => pending.set(name(url), { resolve, reject }));
    },
    upload: (t) => {
      if (name(t.url) === uploadThrows) throw new Error('texImage2D: out of memory');
      log.push(`upload ${name(t.url)}`);
    },
    apply: (maps) => log.push(`apply ${name(maps.colour.url)}`),
    dispose: (t) => log.push(`dispose ${name(t.url)}`),
    warn: vi.fn(),
    clock: time.clock,
    trace: {
      mark: (event: MapEvent) => void lines.push(mapLine(event)),
      size: (t) => {
        const level = Number(/(\d)k$/.exec(name(t.url))?.[1]);
        return `${level * 1024}x${level * 512}`;
      },
      glError: () => 'NO_ERROR',
    },
  };
  /** Answers the load of `key` (e.g. «lroc-2k») after `ms`, or fails it with `error`. */
  const answer = async (key: string, ms = 0, error?: unknown): Promise<void> => {
    time.advance(ms);
    const load = pending.get(key);
    pending.delete(key);
    if (error === undefined) load?.resolve({ url: `/textures/moon-${key}.jpg` });
    else load?.reject(error);
    await flush();
  };
  /** Answers both maps of a level, the relief first. */
  const level = async (level: number, ms = 0): Promise<void> => {
    await answer(`lola-normal-${Math.min(level, 4)}k`, ms);
    await answer(`lroc-${level}k`);
  };
  const advance = async (ms: number): Promise<void> => {
    time.advance(ms);
    await flush();
  };
  return { swap: new TextureSwap(deps), log, lines, answer, level, advance, time };
}

describe('the globe\'s map trace', () => {
  it('says what a climb from 1K through 2K to 4K asked, how long each map took and its size', async () => {
    const { swap, lines, level } = setUp();
    swap.want(1);
    await level(1, 300);
    swap.want(2);
    await level(2, 1200);
    swap.want(4);
    await level(4, 1400);
    expect(lines).toEqual([
      '1K wanted (none shown)',
      '1K maps asked',
      '1K relief loading: moon-lola-normal-1k.jpg',
      '1K colour loading: moon-lroc-1k.jpg',
      '1K relief landed in 0.3 s (1024x512)',
      '1K colour landed in 0.3 s (1024x512)',
      '1K colour uploaded, gl NO_ERROR',
      '1K relief uploaded, gl NO_ERROR',
      '1K on the Moon',
      '2K wanted (1K shown)',
      '2K maps asked',
      '2K relief loading: moon-lola-normal-2k.jpg',
      '2K colour loading: moon-lroc-2k.jpg',
      '2K relief landed in 1.2 s (2048x1024)',
      '2K colour landed in 1.2 s (2048x1024)',
      '2K colour uploaded, gl NO_ERROR',
      '2K relief uploaded, gl NO_ERROR',
      '2K on the Moon',
      '4K wanted (2K shown)',
      '4K maps asked',
      '4K relief loading: moon-lola-normal-4k.jpg',
      '4K colour loading: moon-lroc-4k.jpg',
      '4K relief landed in 1.4 s (4096x2048)',
      '4K colour landed in 1.4 s (4096x2048)',
      '4K colour uploaded, gl NO_ERROR',
      '4K relief uploaded, gl NO_ERROR',
      '4K on the Moon',
    ]);
  });

  it('says which map failed, with what the browser said, and that the level was given up', async () => {
    const { swap, lines, level, answer } = setUp();
    swap.want(2);
    await level(2);
    lines.length = 0;
    swap.want(4);
    await answer('lola-normal-4k', 0, new Error('404 Not Found'));
    await answer('lroc-4k', 0, { type: 'error' });
    expect(lines.filter((line) => !line.includes('loading'))).toEqual([
      '4K wanted (2K shown)',
      '4K maps asked',
      '4K relief failed: moon-lola-normal-4k.jpg (404 Not Found)',
      '4K colour failed: moon-lroc-4k.jpg (error event, no details)',
      '4K given up, 2K stays',
    ]);
    expect(swap.shown()).toBe(2);
  });

  it('says when a level lowered while the globe hides, and when a bigger map lands after it', async () => {
    const { swap, lines, level } = setUp();
    swap.want(1);
    await level(1);
    swap.want(4);
    swap.lower(1);
    await level(4);
    swap.want(4);
    await level(4);
    swap.lower(1);
    await level(1);
    expect(lines.filter((line) => /lowered|freed|on the Moon/.test(line))).toEqual([
      '1K on the Moon',
      // Lowered while the 4K was in flight, so the 1K is still what shows.
      'lowered to 1K, globe hidden (1K shown)',
      '4K freed on landing, lowered meanwhile',
      '4K on the Moon',
      'lowered to 1K, globe hidden (4K shown)',
      '1K on the Moon',
    ]);
  });
});

describe('a level whose upload throws', () => {
  it('fails like a map that did not load: told, its maps freed, and the swapper free for the next level', async () => {
    const { swap, log, lines, level } = setUp('lroc-4k');
    swap.want(2);
    await level(2);
    swap.want(4);
    await level(4);
    expect(lines).toContain('4K threw: texImage2D: out of memory');
    expect(lines).toContain('4K given up, 2K stays');
    expect(log).toEqual(expect.arrayContaining(['dispose lroc-4k', 'dispose lola-normal-4k']));
    expect(swap.shown()).toBe(2);
    swap.want(8);
    expect(log).toContain('load lroc-8k');
    await level(8);
    expect(swap.shown()).toBe(8);
  });
});

/** The first wait after a failure, and the most a wait grows to (src/globe/level-backoff.ts). */
const FIRST_WAIT_MS = 2000;
const MAX_WAIT_MS = 60_000;

/** A swapper showing 2K whose 4K colour map fails every time it is asked. */
async function failingFourK() {
  const parts = setUp();
  parts.swap.want(2);
  await parts.level(2);
  const fail = async (): Promise<void> => {
    await parts.answer('lola-normal-4k');
    await parts.answer('lroc-4k', 0, new Error('404 Not Found'));
  };
  const asks = (): number => parts.log.filter((line) => line === 'load lroc-4k').length;
  return { ...parts, fail, asks };
}

describe('a level that failed waits before it is asked again', () => {
  it('is not fetched again on the next frames drawn, only once its wait has passed', async () => {
    const { swap, fail, asks, advance } = await failingFourK();
    swap.want(4);
    await fail();
    for (let frame = 0; frame < 10; frame++) {
      await advance(100);
      swap.want(4);
    }
    expect(asks()).toBe(1);
    await advance(FIRST_WAIT_MS - 1000);
    swap.want(4);
    expect(asks()).toBe(2);
  });

  it('waits twice as long after each failure of the same level, up to a minute', async () => {
    const { swap, fail, asks, advance } = await failingFourK();
    const waits: number[] = [];
    swap.want(4);
    for (let failures = 1; failures <= 7; failures++) {
      await fail();
      let waited = 0;
      while (asks() === failures) {
        await advance(1000);
        waited += 1000;
        swap.want(4);
      }
      waits.push(waited);
    }
    expect(waits).toEqual([2000, 4000, 8000, 16000, 32000, MAX_WAIT_MS, MAX_WAIT_MS]);
  });

  it('never holds back a higher level, and starts afresh once a level lands', async () => {
    const { swap, fail, asks, advance, log, level } = await failingFourK();
    swap.want(4);
    await fail();
    swap.want(8);
    expect(log).toContain('load lroc-8k');
    await level(8);
    expect(swap.shown()).toBe(8);
    swap.lower(2);
    await level(2);
    await advance(1);
    swap.want(4);
    expect(asks()).toBe(2);
  });
});

describe('a map load that never settles', () => {
  it('fails after the bound, so the swapper is free and a higher level asked later is fetched', async () => {
    const { swap, log, lines, answer, advance } = setUp();
    swap.want(1);
    await answer('lola-normal-1k');
    await answer('lroc-1k');
    swap.want(2);
    await answer('lola-normal-2k');
    // The 2K colour never answers.
    await advance(MAP_TIMEOUT_MS - 1);
    swap.want(4);
    expect(log.filter((line) => line === 'load lroc-4k')).toEqual([]);
    await advance(1);
    expect(lines).toContain(`2K colour timed out after ${MAP_TIMEOUT_MS / 1000} s: moon-lroc-2k.jpg`);
    // The 2K relief that did land is freed with its failed level; the 4K asked meanwhile is fetched next.
    expect(log).toContain('dispose lola-normal-2k');
    expect(log).toContain('load lroc-4k');
    await answer('lola-normal-4k');
    await answer('lroc-4k');
    expect(swap.shown()).toBe(4);
  });

  it('is retried when the level is asked again after its wait', async () => {
    const { swap, log, answer, advance } = setUp();
    swap.want(1);
    await answer('lola-normal-1k');
    await answer('lroc-1k');
    swap.want(2);
    await answer('lola-normal-2k');
    await advance(MAP_TIMEOUT_MS);
    expect(swap.shown()).toBe(1);
    // A frame drawn after the first wait asks for 2K again: it is fetched again.
    await advance(FIRST_WAIT_MS);
    swap.want(2);
    expect(log.filter((line) => line === 'load lroc-2k')).toHaveLength(2);
    await answer('lola-normal-2k');
    await answer('lroc-2k');
    expect(swap.shown()).toBe(2);
  });

  it('frees a late answer that comes after its bound, and never shows it', async () => {
    const { swap, log, answer, advance, time } = setUp();
    swap.want(1);
    await answer('lola-normal-1k');
    await advance(MAP_TIMEOUT_MS);
    expect(swap.shown()).toBe(0);
    expect(time.timers.size).toBe(0);
    await answer('lroc-1k');
    expect(log.filter((line) => line === 'dispose lroc-1k')).toHaveLength(1);
    expect(log.some((line) => line.startsWith('apply'))).toBe(false);
  });

  it('cancels its bound once the map lands', async () => {
    const { swap, time, answer } = setUp();
    swap.want(1);
    expect(time.timers.size).toBe(2);
    await answer('lola-normal-1k');
    await answer('lroc-1k');
    expect(time.timers.size).toBe(0);
    expect(swap.shown()).toBe(1);
  });
});

describe('the density rule in the trace', () => {
  const PHONE_PX = 590 * 1.75;
  const caps = { tier: 'medium', phone: true, coarsePointer: true, saveData: false, maxTextureSize: 8192 } as const;

  it('tells the level it wants with what it read, only when its answer changes', () => {
    const lines: string[] = [];
    const want = ruleWatch(() => caps, { mark: (event) => void lines.push(mapLine(event)) });
    expect(want({ distance: 4.5, frameBufferPx: PHONE_PX })).toBe(2);
    want({ distance: 4.4, frameBufferPx: PHONE_PX });
    expect(want({ distance: 1.6, frameBufferPx: PHONE_PX })).toBe(4);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^rule wants 2K: disc \d+ px, \d\.\d\d px\/texel; medium, phone, coarse pointer, max 8192$/);
    expect(lines[1]).toMatch(/^rule wants 4K: disc \d+ px, \d\.\d\d px\/texel; medium, phone, coarse pointer, max 8192$/);
  });

  it('says when Save-Data holds it at the start map', () => {
    const lines: string[] = [];
    const want = ruleWatch(() => ({ ...caps, saveData: true }), { mark: (event) => void lines.push(mapLine(event)) });
    expect(want({ distance: 1.6, frameBufferPx: PHONE_PX })).toBe(1);
    expect(lines[0]).toMatch(/^rule wants 1K: .*; medium, phone, coarse pointer, save-data on, max 8192$/);
  });

  it('names the signal that stops the medium tier at 4K: the layout, the pointer, or neither on a desktop', () => {
    const line = (extra: Partial<LodCaps>) => {
      const lines: string[] = [];
      ruleWatch(() => ({ ...caps, ...extra }), { mark: (event) => void lines.push(mapLine(event)) })({ distance: 1.6, frameBufferPx: 547 * 2 });
      return lines[0];
    };
    expect(line({ phone: false, coarsePointer: true })).toMatch(/^rule wants 4K: .*; medium, coarse pointer, max 8192$/);
    expect(line({ phone: false, coarsePointer: false })).toMatch(/^rule wants 8K: .*; medium, max 8192$/);
  });

  // VENT-123: with KTX2 on a phone climbs to 8K, and the line says why.
  it('names KTX2 when it lets a phone climb to 8K', () => {
    const lines: string[] = [];
    let ktx2 = true;
    const want = ruleWatch(() => ({ ...caps, ktx2 }), { mark: (event) => void lines.push(mapLine(event)) });
    expect(want({ distance: 1.6, frameBufferPx: 547 * 2 })).toBe(8);
    ktx2 = false;
    expect(want({ distance: 1.6, frameBufferPx: 547 * 2 })).toBe(4);
    expect(lines).toEqual([
      expect.stringMatching(/^rule wants 8K: .*; medium, phone, coarse pointer, KTX2, max 8192$/),
      expect.stringMatching(/^rule wants 4K: .*; medium, phone, coarse pointer, max 8192$/),
    ]);
  });

  it('names the GL errors an upload can leave', () => {
    expect([0, 0x505, 0x9242, 0x1234].map(glErrorName)).toEqual(['NO_ERROR', 'OUT_OF_MEMORY', 'CONTEXT_LOST_WEBGL', '0x1234']);
  });
});

describe('the map trace in the dev tools\' breadcrumbs', () => {
  it('is nothing at all without the dev tools', () => {
    expect(mapCrumbs(null)).toBeUndefined();
  });

  it('keeps the lines from before the tools came, and marks them with the globe\'s prefix when they come', async () => {
    const marks: string[] = [];
    let arrive: (value: unknown) => void = () => undefined;
    const tools = new Promise((resolve) => (arrive = resolve));
    const trace = mapCrumbs(tools as never);
    trace?.mark({ kind: 'wanted', level: 1, shown: 0 });
    expect(marks).toEqual([]);
    arrive({ devTools: async () => ({ crumbs: { mark: (s: string) => void marks.push(s) } }) });
    await flush();
    trace?.mark({ kind: 'applied', level: 1 });
    expect(marks).toEqual(['globe: 1K wanted (none shown)', 'globe: 1K on the Moon']);
  });

  it('marks an event repeated by retries once, whatever its seconds, so a failing level does not flood the trail', async () => {
    const marks: string[] = [];
    const trace = mapCrumbs(Promise.resolve({
      devTools: async () => ({ crumbs: { mark: (s: string) => void marks.push(s) } }),
    }) as never);
    await flush();
    for (let i = 0; i < 3; i++) {
      trace?.mark({ kind: 'wanted', level: 4, shown: 2 });
      trace?.mark({ kind: 'failed', level: 4, map: 'colour', file: 'moon-lroc-4k.jpg', reason: 'no details' });
      // Each try's relief lands in its own time: still the same event.
      trace?.mark({ kind: 'landed', level: 4, map: 'relief', seconds: 0.2 + i / 10, size: '4096x2048' });
      trace?.mark({ kind: 'gaveUp', level: 4, shown: 2 });
    }
    expect(marks).toEqual([
      'globe: 4K wanted (2K shown)',
      'globe: 4K colour failed: moon-lroc-4k.jpg (no details)',
      'globe: 4K relief landed in 0.2 s (4096x2048)',
      'globe: 4K given up, 2K stays',
    ]);
  });

  it('reads a map\'s size from its image', () => {
    expect(pixelSize({ image: { width: 4096, height: 2048 } })).toBe('4096x2048');
    expect(pixelSize({ image: null })).toBe('size unknown');
  });
});
