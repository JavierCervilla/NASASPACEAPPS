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

/** The look a point opens at: the view goes home, any coast stops. */
const openAt = (parts: Parts, input: SceneInput): void => {
  const { view } = parts;
  view.home = startLook(input.startYawDeg);
  view.coast = null;
  view.homing = null;
  parts.set(view.home);
};

/** The first frame of the next input after a park: told to the panel. */
const drawFirst = ({ view, loop }: Parts): void => {
  view.told = false;
  loop.invalidate();
};

/**
 * `scene` that opens a new point (another seed) at its opening look, and
 * tells `onDrawn` again after `rearm`, on the first frame of the next input
 * and not before.
 */
export function withNewPoints(
  scene: Omit<TerrainScene, 'rearm'>,
  parts: Parts,
): TerrainScene {
  const { view } = parts;
  let current = parts.seed;
  let parked = false;
  return {
    ...scene,
    rearm: (): void => {
      // No frame: the old world would be drawn under the loader, and a frame
      // it draws anyway must not tell the panel the new point is up.
      parked = true;
      view.told = true;
    },
    update: (input: SceneInput): void => {
      if (input.seed !== current) {
        current = input.seed;
        openAt(parts, input);
      }
      scene.update(input);
      if (!parked) return;
      parked = false;
      drawFirst(parts);
    },
  };
}
