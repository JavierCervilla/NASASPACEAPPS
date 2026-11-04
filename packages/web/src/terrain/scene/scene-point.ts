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
 * The view stays on its one renderer when the selected point changes
 * (VENT-69): a new point rebuilds the world on it (world.ts) and the look
 * goes back to the new point's opening, which is the only part of a point
 * the world does not take from the input.
 */
import { startLook, type Look } from '../view-camera';
import type { ViewState } from './scene-frame';
import type { SceneInput, TerrainScene } from './scene-types';

interface Parts {
  readonly view: ViewState;
  readonly loop: { readonly invalidate: () => void };
  readonly set: (look: Look) => void;
  /** The seed of the point the scene opened on. */
  readonly seed: number;
}

/**
 * `scene` that opens a new point (another seed) at its opening look, and
 * tells `onDrawn` again after `rearm`.
 */
export function withNewPoints(
  scene: Omit<TerrainScene, 'rearm'>,
  parts: Parts,
): TerrainScene {
  const { view, loop, set } = parts;
  let current = parts.seed;
  return {
    ...scene,
    rearm: (): void => {
      view.told = false;
      loop.invalidate();
    },
    update: (input: SceneInput): void => {
      if (input.seed !== current) {
        current = input.seed;
        view.home = startLook(input.startYawDeg);
        view.coast = null;
        view.homing = null;
        set(view.home);
      }
      scene.update(input);
    },
  };
}
