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

import { describe, expect, it } from 'vitest';
import { createShadowGate } from '../src/terrain/scene/shadow-gate';
import { castsShadow } from '../src/terrain/scene/shadow-jobs';
import { createSlicer } from '../src/terrain/scene/slicer';

/** A shadow map that, like three's, clears needsUpdate when it renders. */
function fakeMap() {
  const map = { needsUpdate: false, renders: 0 };
  const draw = (): void => {
    if (!map.needsUpdate) return;
    map.renders += 1;
    map.needsUpdate = false;
  };
  return { map, draw };
}

function frame(gate: ReturnType<typeof createShadowGate>, draw: () => void) {
  gate.beforeDraw();
  draw();
  gate.afterDraw();
}

describe('the shadow map on demand (VENT-73)', () => {
  it('renders on the first frame and then not while the camera turns', () => {
    const { map, draw } = fakeMap();
    const gate = createShadowGate(map);
    frame(gate, draw);
    for (let i = 0; i < 20; i += 1) frame(gate, draw);
    expect(map.renders).toBe(1);
    expect(gate.renders()).toBe(1);
  });

  it('renders once more for a mark, however many marks came before the frame', () => {
    const { map, draw } = fakeMap();
    const gate = createShadowGate(map);
    frame(gate, draw);
    gate.mark();
    gate.mark();
    frame(gate, draw);
    frame(gate, draw);
    expect(map.renders).toBe(2);
    expect(gate.renders()).toBe(2);
  });

  it('keeps asking while the map did not render (shadows left out)', () => {
    const map = { needsUpdate: false };
    const gate = createShadowGate(map);
    gate.beforeDraw();
    gate.afterDraw();
    expect(gate.renders()).toBe(0);
    expect(map.needsUpdate).toBe(true);
  });

  it('knows which jobs only paint and which build geometry', () => {
    for (const key of ['lit:L0/1/2', 'far2', 'clods:3', 'crater:bake:0']) {
      expect(castsShadow(key), key).toBe(false);
    }
    for (const key of ['L1/3/4', 'rocks:0', 'crater:build:2', 'crater:lit:5']) {
      expect(castsShadow(key), key).toBe(true);
    }
  });

  it('is marked by the jobs that build geometry, quiet or not', () => {
    const { map, draw } = fakeMap();
    const gate = createShadowGate(map);
    frame(gate, draw);
    const turns: (() => void)[] = [];
    const slicer = createSlicer({ invalidate: () => undefined,
      schedule: (fn) => { turns.push(fn); return 1; }, cancel: () => undefined,
      onJob: (key) => { if (castsShadow(key)) gate.mark(); } });
    slicer.add('lit:L0', 1, () => undefined);
    slicer.add('rocks:0', 2, () => undefined, true);
    frame(gate, draw);
    expect(map.renders).toBe(1);
    turns[0]?.();
    frame(gate, draw);
    expect(map.renders).toBe(2);
  });
});
