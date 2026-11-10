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

import {
  DirectionalLight, Group, Mesh, PerspectiveCamera, Scene, type WebGLRenderer,
} from 'three';
import { describe, expect, it } from 'vitest';
import { createSky } from '../src/terrain/scene/sky';
import {
  drawSplit, FAR_FROM_LEVEL, FAR_LAYER, FAR_PLANES, FULL_PLANES, NEAR_LAYER, NEAR_PLANES, sendFar,
} from '../src/terrain/scene/depth-passes';
import { stageDraw } from '../src/terrain/scene/stage-draw';
import type { ShadowGate } from '../src/terrain/scene/shadow-gate';

interface Seen { near: number; far: number; layers: number; autoClearColor: boolean; step: string }

/** A renderer that notes what the camera and the clear flags were at each render. */
function fakeRenderer(log: string[], autoReset = true) {
  const seen: Seen[] = [];
  let calls = 0;
  const renderer = {
    autoClearColor: true,
    info: { autoReset, render: { calls: 0, triangles: 0 } },
    render: (_scene: Scene, camera: PerspectiveCamera) => {
      seen.push({ near: camera.near, far: camera.far, layers: camera.layers.mask,
        autoClearColor: renderer.autoClearColor, step: log.join() });
      calls = autoReset ? 0 : calls;
      calls += seen.length * 10;
      renderer.info.render.calls = calls;
      renderer.info.render.triangles = calls * 100;
    },
  };
  return { renderer: renderer as unknown as WebGLRenderer, seen };
}

describe('the split draw planes (VENT-114)', () => {
  it('gives the near pass the near plane of the view and a far plane that holds level 1', () => {
    expect(NEAR_PLANES.near).toBe(FULL_PLANES.near);
    // Level 1's window is 16 km across: its corner is 8 km x sqrt 2 from the site, 0.25 km of alignment more.
    expect(NEAR_PLANES.far).toBeGreaterThan(8000 * Math.SQRT2 + 250);
    expect(NEAR_PLANES.far).toBeLessThan(16_000);
  });

  it('starts the far pass inside level 2 and ends it past the stars, 24 bits resolving metres at 190 km', () => {
    expect(FAR_PLANES.near).toBeLessThanOrEqual(1000);
    expect(FAR_PLANES.far).toBeGreaterThan(900_000);
    const step = (d: number) => (d * d) / (FAR_PLANES.near * 2 ** 24);
    expect(step(190_000)).toBeLessThan(3);
    expect(step(NEAR_PLANES.far)).toBeLessThan(0.01);
  });

  it('keeps the rings of level 2 and up for the far pass', () => {
    expect(FAR_FROM_LEVEL).toBe(2);
  });
});

describe('which pass an object is drawn in', () => {
  it('sends a mesh and its children to the far layer alone', () => {
    const group = new Group();
    const mesh = new Mesh();
    group.add(mesh);
    sendFar(group);
    for (const o of [group, mesh]) {
      expect(o.layers.isEnabled(FAR_LAYER)).toBe(true);
      expect(o.layers.isEnabled(NEAR_LAYER)).toBe(false);
    }
  });

  it('keeps a light in both passes, so both build the same programs', () => {
    const group = new Group();
    const light = new DirectionalLight();
    group.add(light);
    sendFar(group);
    expect(light.layers.isEnabled(FAR_LAYER)).toBe(true);
    expect(light.layers.isEnabled(NEAR_LAYER)).toBe(true);
  });

  it('puts the whole sky in the far pass and its four lights in both', () => {
    const { group } = createSky(1, 256);
    sendFar(group);
    const lights: boolean[] = [];
    const bodies: boolean[] = [];
    group.traverse((o) => {
      if (o === group) return;
      const isLight = (o as { isLight?: boolean }).isLight === true;
      (isLight ? lights : bodies).push(o.layers.isEnabled(NEAR_LAYER));
    });
    expect(lights).toHaveLength(4);
    expect(lights.every(Boolean)).toBe(true);
    expect(bodies.some(Boolean)).toBe(false);
  });
});

describe('drawSplit', () => {
  const camera = () => new PerspectiveCamera(50, 1, FULL_PLANES.near, FULL_PLANES.far);

  it('draws the far pass, then the near pass without clearing the colour, with each pass its own planes', () => {
    const log: string[] = [];
    const { renderer, seen } = fakeRenderer(log);
    drawSplit({ renderer, scene: new Scene(), camera: camera(), beforeNear: () => log.push('shadow') });
    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatchObject({ ...FAR_PLANES, layers: 1 << FAR_LAYER, autoClearColor: true });
    expect(seen[1]).toMatchObject({ ...NEAR_PLANES, layers: 1 << NEAR_LAYER, autoClearColor: false });
  });

  it('asks the shadow map between the passes, so only the near pass renders it', () => {
    const log: string[] = [];
    const { renderer, seen } = fakeRenderer(log);
    drawSplit({ renderer, scene: new Scene(), camera: camera(), beforeNear: () => log.push('shadow') });
    expect(seen[0]?.step).toBe('');
    expect(seen[1]?.step).toBe('shadow');
  });

  it('hands the camera and the clear flag back as they were', () => {
    const cam = camera();
    const { renderer } = fakeRenderer([]);
    drawSplit({ renderer, scene: new Scene(), camera: cam, beforeNear: () => undefined });
    expect([cam.near, cam.far, cam.layers.mask]).toEqual([FULL_PLANES.near, FULL_PLANES.far, 1 << NEAR_LAYER]);
    expect(renderer.autoClearColor).toBe(true);
    // The projection is the full range's again, for whoever projects with it.
    expect(cam.projectionMatrix.elements[10]).toBeCloseTo(
      -(FULL_PLANES.far + FULL_PLANES.near) / (FULL_PLANES.far - FULL_PLANES.near));
  });

  it('hands them back when a render throws', () => {
    const cam = camera();
    const { renderer } = fakeRenderer([]);
    renderer.render = () => { throw new Error('lost'); };
    expect(() => drawSplit({ renderer, scene: new Scene(), camera: cam, beforeNear: () => undefined })).toThrow();
    expect(renderer.autoClearColor).toBe(true);
    expect(cam.far).toBe(FULL_PLANES.far);
  });

  it('adds the two passes up, whether three resets the counts or the dev tools add them', () => {
    for (const autoReset of [true, false]) {
      const { renderer } = fakeRenderer([], autoReset);
      const cost = drawSplit({ renderer, scene: new Scene(), camera: camera(), beforeNear: () => undefined });
      expect(cost).toEqual({ calls: 10 + 20, triangles: 1000 + 2000 });
    }
  });
});

describe('the stage draw', () => {
  const gate = (log: string[]): ShadowGate => ({ mark: () => undefined, afterDraw: () => undefined,
    renders: () => 0, beforeDraw: () => void log.push('shadow') });

  it('draws one pass, the shadow map first, for every single-pass depth', () => {
    for (const mode of ['log', 'linear', 'reversed'] as const) {
      const log: string[] = [];
      const { renderer, seen } = fakeRenderer(log);
      const draw = stageDraw({ renderer, scene: new Scene(), camera: camera(), shadow: gate(log) }, mode);
      draw.draw();
      expect(draw.split).toBe(false);
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({ ...FULL_PLANES, layers: 1, step: 'shadow' });
    }
  });

  it('draws two passes for the split depth and counts both', () => {
    const log: string[] = [];
    const { renderer, seen } = fakeRenderer(log);
    const draw = stageDraw({ renderer, scene: new Scene(), camera: camera(), shadow: gate(log) }, 'split');
    draw.draw();
    expect(draw.split).toBe(true);
    expect(seen).toHaveLength(2);
    expect(draw.cost().calls).toBe(30);
  });

  function camera() { return new PerspectiveCamera(50, 1, FULL_PLANES.near, FULL_PLANES.far); }
});
