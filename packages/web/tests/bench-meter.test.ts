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
 * The step meter (VENT-81, Guardián round 1): only the animation frames in which a wrapped render drew add a frame
 * interval; idle frames add none. And variant B's release puts the WebGL loss mark back as it was.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebGLRenderer } from 'three';
import { startMeter } from '../src/bench/meter';
import { createRegistry } from '../src/bench/registry';
import { releaseGlobe } from '../src/bench/release';
import { memoryStorage } from './bench-factories';

const GL_LOST_KEY = 'ventana.glLostAt';

/** A renderer the registry can wrap, over a canvas that is a plain event target. */
function fakeRenderer(lose?: () => void) {
  const state = { lost: false };
  const canvas = new EventTarget();
  const gl = {
    isContextLost: () => state.lost,
    getExtension: () => ({ loseContext: () => {
      state.lost = true;
      lose?.();
      canvas.dispatchEvent(new Event('webglcontextlost'));
    } }),
  };
  const renderer = {
    domElement: canvas, getContext: () => gl, render: () => undefined,
    info: { render: { calls: 2, triangles: 100 }, memory: { textures: 1 } },
  };
  return { renderer: renderer as unknown as WebGLRenderer, canvas };
}

describe('startMeter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('counts the interval of each animation frame a wrapped render drew in, and no idle one', () => {
    const frames: ((at: number) => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (run: (at: number) => void) => frames.push(run));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const registry = createRegistry();
    const { renderer } = fakeRenderer();
    registry.attach({ renderer, kind: 'onFoot' });
    const end = startMeter('turn', registry);
    const frame = (at: number, draw: boolean) => {
      if (draw) renderer.render({} as never, {} as never);
      frames.shift()?.(at);
    };
    frame(0, false);
    frame(16, true);
    frame(32, false);
    frame(48, false);
    frame(100, true);
    const metrics = end(false);
    expect(metrics.frames.drawn).toBe(2);
    expect(metrics.frames.worstMs).toBe(52);
    expect(metrics.triangles).toBe(100);
    expect(metrics.contexts).toBe(1);
  });
});

describe('releaseGlobe', () => {
  it.each([[null], ['1700000000000']])('puts the loss mark back as it was (%s), and the loss is not counted', (before) => {
    const local = memoryStorage(before === null ? {} : { [GL_LOST_KEY]: before });
    const registry = createRegistry();
    const { renderer, canvas } = fakeRenderer();
    // The app's own listener (lib/gl-renderer.ts) marks every loss, and was added first.
    canvas.addEventListener('webglcontextlost', () => local.setItem(GL_LOST_KEY, String(Date.now())));
    registry.attach({ renderer, kind: 'globe' });
    expect(releaseGlobe(registry, local)).toBe(true);
    expect(local.getItem(GL_LOST_KEY)).toBe(before);
    expect(registry.drain().lost).toBe(0);
    expect(releaseGlobe(registry, local)).toBe(false);
  });
});
