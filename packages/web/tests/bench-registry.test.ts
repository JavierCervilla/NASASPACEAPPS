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

/** What the benchmark watches on a renderer (VENT-81): its draws, its losses, and when the view has settled. */
import type { WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { createRegistry } from '../src/bench/registry';
import { sampleRenderers } from '../src/bench/sample';
import { isSettled } from '../src/bench/settle';

/** A renderer as far as the benchmark reads one, over a canvas that is a plain event target. */
function fakeRenderer(triangles: number) {
  const state = { lost: false, renders: 0 };
  const canvas = new EventTarget();
  const renderer = {
    domElement: canvas,
    info: { render: { calls: 0, triangles: 0 }, memory: { textures: 4 } },
    getContext: () => ({ isContextLost: () => state.lost }),
    render() {
      state.renders += 1;
      renderer.info.render = { calls: 3, triangles };
    },
  };
  const lose = () => {
    state.lost = true;
    canvas.dispatchEvent(new Event('webglcontextlost'));
  };
  return { renderer: renderer as unknown as WebGLRenderer, state, lose };
}

describe('the registry', () => {
  it('counts each frame of an attached renderer, with its calls and triangles, until drained or detached', async () => {
    const registry = createRegistry();
    const fake = fakeRenderer(900);
    const detach = registry.attach({ renderer: fake.renderer, kind: 'onFoot' });
    fake.renderer.render({} as never, {} as never);
    await Promise.resolve();
    fake.renderer.render({} as never, {} as never);
    await Promise.resolve();
    expect(fake.state.renders).toBe(2);
    expect(registry.drain()).toEqual({ draws: [{ calls: 3, triangles: 900 }, { calls: 3, triangles: 900 }], lost: 0 });
    expect(registry.drain().draws).toEqual([]);
    detach();
    fake.renderer.render({} as never, {} as never);
    await Promise.resolve();
    expect(registry.drain().draws).toEqual([]);
    expect(registry.handles()).toEqual([]);
  });

  it('counts the split draw\'s two renders in one turn as one frame, their calls and triangles summed (VENT-118)', async () => {
    const registry = createRegistry();
    const fake = fakeRenderer(900);
    registry.attach({ renderer: fake.renderer, kind: 'onFoot' });
    fake.renderer.render({} as never, {} as never);
    fake.renderer.render({} as never, {} as never);
    await Promise.resolve();
    expect(registry.drain().draws).toEqual([{ calls: 6, triangles: 1800 }]);
  });

  it('counts a context loss, but not the one the benchmark caused, nor a render on a lost context', () => {
    const registry = createRegistry();
    const [globe, view] = [fakeRenderer(10), fakeRenderer(20)];
    registry.attach({ renderer: globe.renderer, kind: 'globe', textureBytes: () => 5000 });
    registry.attach({ renderer: view.renderer, kind: 'onFoot' });
    expect(sampleRenderers(registry.handles())).toEqual({ contexts: 2, textureBytes: 5000, textures: 4 });
    registry.expectLoss(globe.renderer.domElement);
    globe.lose();
    globe.renderer.render({} as never, {} as never);
    expect(registry.drain()).toEqual({ draws: [], lost: 0 });
    expect(sampleRenderers(registry.handles())).toEqual({ contexts: 1, textureBytes: 0, textures: 4 });
    view.lose();
    expect(registry.drain().lost).toBe(1);
  });
});

describe('isSettled', () => {
  const settled = { ready: 'true', working: 'false', frames: '5', parked: false, farPending: false };

  it('holds once the scene stands, rests, is not parked, has drawn since and has its far tiles', () => {
    expect(isSettled(settled, 4)).toBe(true);
  });

  it('waits for each of those', () => {
    expect(isSettled({ ...settled, ready: undefined }, 4)).toBe(false);
    expect(isSettled({ ...settled, working: 'true' }, 4)).toBe(false);
    expect(isSettled({ ...settled, parked: true }, 4)).toBe(false);
    expect(isSettled({ ...settled, farPending: true }, 4)).toBe(false);
    expect(isSettled(settled, 5)).toBe(false);
  });
});
