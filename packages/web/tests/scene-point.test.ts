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

import { describe, expect, it, vi } from 'vitest';
import type { ViewState } from '../src/terrain/scene/scene-frame';
import { withNewPoints } from '../src/terrain/scene/scene-point';
import type { SceneInput } from '../src/terrain/scene/scene-types';

function build() {
  const view = { told: true, home: {}, coast: null, homing: null } as unknown as ViewState;
  const loop = { invalidate: vi.fn() };
  const update = vi.fn();
  const scene = withNewPoints({ update } as never, { view, loop, set: vi.fn(), seed: 1 });
  return { view, loop, scene };
}

describe('a parked scene (VENT-69)', () => {
  it('draws nothing when re-armed, however many times it is', () => {
    const { view, loop, scene } = build();
    scene.rearm();
    scene.rearm();
    expect(view.told).toBe(true);
    expect(loop.invalidate).not.toHaveBeenCalled();
  });

  it('asks its first frame, and tells the panel of it, when the next input arrives', () => {
    const { view, loop, scene } = build();
    scene.rearm();
    scene.update({ seed: 2, startYawDeg: 0 } as SceneInput);
    expect(view.told).toBe(false);
    expect(loop.invalidate).toHaveBeenCalledTimes(1);
  });

  it('asks no extra frame for an input while it is not parked', () => {
    const { loop, scene } = build();
    scene.update({ seed: 1, startYawDeg: 0 } as SceneInput);
    expect(loop.invalidate).not.toHaveBeenCalled();
  });
});
