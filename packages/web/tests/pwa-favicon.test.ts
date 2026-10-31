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
 * The live favicon (VENT-28): the ring emphasises the selected site's state, the icon is drawn with the reference's
 * geometry, and the favicon redraws only when its frame or the state changes, at most once per throttle window.
 */
import { describe, expect, it, vi } from 'vitest';
import { drawIcon, type IconContext } from '../src/pwa/icon-draw';
import { createLiveFavicon, THROTTLE_MS, type FaviconDeps } from '../src/pwa/live-favicon';
import { DIMMED, ringEmphasis } from '../src/pwa/ring';

describe('ringEmphasis', () => {
  it('shows the whole legend with no state or with «none»', () => {
    expect(ringEmphasis(null)).toEqual({ sun: 1, window: 1, earth: 1 });
    expect(ringEmphasis('none')).toEqual({ sun: 1, window: 1, earth: 1 });
  });

  it.each([
    ['window', { sun: DIMMED, window: 1, earth: DIMMED }],
    ['sun', { sun: 1, window: DIMMED, earth: DIMMED }],
    ['earth', { sun: DIMMED, window: DIMMED, earth: 1 }],
  ] as const)('emphasises the %s arc and dims the others', (state, expected) => {
    expect(ringEmphasis(state)).toEqual(expected);
  });
});

/** A canvas that records the arcs it strokes with their colour and opacity. */
function recordingContext() {
  const strokes: { colour: string; alpha: number; from: number; to: number }[] = [];
  let arc = { from: 0, to: 0 };
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    globalAlpha: 1,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    arc: (_x: number, _y: number, _r: number, from: number, to: number) => {
      arc = { from, to };
    },
    stroke: () => strokes.push({ colour: String(ctx.strokeStyle), alpha: ctx.globalAlpha, ...arc }),
  };
  return { ctx: ctx as unknown as IconContext & typeof ctx, strokes };
}

describe('drawIcon', () => {
  it('draws the Moon at 600/1024 of the side, centred, and the ring from 12 o’clock clockwise', () => {
    const { ctx, strokes } = recordingContext();
    const moon = {} as CanvasImageSource;
    drawIcon(ctx, { size: 64, moon, emphasis: ringEmphasis('sun') });
    expect(ctx.drawImage).toHaveBeenCalledWith(moon, 13.25, 13.25, 37.5, 37.5);
    expect(strokes.map((s) => s.colour)).toEqual(['#1a1d24', '#f5c542', '#3ddc84', '#4a9cff']);
    expect(strokes.map((s) => s.alpha)).toEqual([1, 1, DIMMED, DIMMED]);
    expect(strokes[1]?.from).toBeCloseTo(-Math.PI / 2);
    expect(strokes[3]?.to).toBeCloseTo(Math.PI / 2);
    expect(ctx.globalAlpha).toBe(1);
  });

  it('draws the ring alone while the Moon has not loaded', () => {
    const { ctx, strokes } = recordingContext();
    drawIcon(ctx, { size: 64, moon: null, emphasis: ringEmphasis(null) });
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(strokes).toHaveLength(4);
  });
});

/** Fake dependencies: a phase that is the instant itself (ms as a share of the month), manual timers. */
function fakeDeps(frame?: FaviconDeps['frame']) {
  const timers: (() => void)[] = [];
  const shown: string[] = [];
  const painted: { index: number | string; emphasis: unknown }[] = [];
  const deps: FaviconDeps = {
    phase: { phaseAt: (atMs) => atMs },
    frame: frame ?? ((index) => Promise.resolve({ index } as unknown as CanvasImageSource)),
    paint: (picture) => {
      const index = (picture.moon as unknown as { index: number } | null)?.index ?? 'ring';
      painted.push({ index, emphasis: picture.emphasis });
      return `data:${index}`;
    },
    show: (href) => shown.push(href),
    setTimer: (fn, ms) => {
      expect(ms).toBe(THROTTLE_MS);
      return timers.push(fn);
    },
    clearTimer: vi.fn(),
  };
  const flush = async () => {
    for (const fn of timers.splice(0)) fn();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { deps, timers, shown, painted, flush };
}

describe('createLiveFavicon', () => {
  it('draws once per throttle window, with the latest frame and state', async () => {
    const { deps, timers, shown, painted, flush } = fakeDeps();
    const favicon = createLiveFavicon(deps);
    favicon.update(0.1, null);
    favicon.update(0.2, null);
    favicon.update(0.5, 'window');
    expect(timers).toHaveLength(1);
    await flush();
    expect(shown).toEqual(['data:15']);
    expect(painted[0]?.emphasis).toEqual(ringEmphasis('window'));
  });

  it('does not redraw while the frame and the state hold, and redraws when either changes', async () => {
    const { deps, timers, shown, flush } = fakeDeps();
    const favicon = createLiveFavicon(deps);
    favicon.update(0.5, 'sun');
    await flush();
    favicon.update(0.501, 'sun');
    expect(timers).toHaveLength(0);
    favicon.update(0.501, 'earth');
    await flush();
    favicon.update(0.6, 'earth');
    await flush();
    expect(shown).toEqual(['data:15', 'data:15', 'data:18']);
  });

  it('drops a draw whose frame arrives after the favicon moved on, and draws the latest', async () => {
    let release: () => void = () => undefined;
    const slow = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { deps, shown, flush } = fakeDeps(async (index) => {
      if (index === 15) await slow;
      return { index } as unknown as CanvasImageSource;
    });
    const favicon = createLiveFavicon(deps);
    favicon.update(0.5, null);
    await flush();
    favicon.update(0.6, null);
    release();
    await flush();
    expect(shown).toEqual(['data:18']);
  });

  it('asks again for a frame that failed to load, showing the ring alone meanwhile', async () => {
    let failures = 1;
    const { deps, shown, flush } = fakeDeps((index) => {
      failures -= 1;
      if (failures >= 0) return Promise.reject(new Error('offline'));
      return Promise.resolve({ index } as unknown as CanvasImageSource);
    });
    const favicon = createLiveFavicon(deps);
    favicon.update(0.5, null);
    await flush();
    expect(shown).toEqual(['data:ring']);
    favicon.update(0.5, null);
    await flush();
    expect(shown).toEqual(['data:ring', 'data:15']);
  });

  it('draws nothing after dispose', async () => {
    const { deps, shown, flush } = fakeDeps();
    const favicon = createLiveFavicon(deps);
    favicon.update(0.3, null);
    favicon.dispose();
    await flush();
    expect(shown).toEqual([]);
    expect(deps.clearTimer).toHaveBeenCalled();
  });
});
