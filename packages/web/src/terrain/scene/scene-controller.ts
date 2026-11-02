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
 * What the on-foot scene hands the panel (VENT-34): turning the look,
 * taking a new input (a new instant, tiles, a mode, which opens the mode
 * on the same heading), drawing again and freeing it all.
 */
import type { Loop } from '../../globe/loop';
import { startLook, type Look } from '../view-camera';
import type { ViewState } from './scene-frame';
import type { SceneHooks, SceneInput, TerrainScene } from './scene-types';
import { applyInput, type World } from './world';

/** Turns the view to `look` and asks for a frame. */
export const turner = (view: ViewState, hooks: SceneHooks, loop: () => Loop) =>
  (look: Look): void => {
    view.look = look;
    hooks.onLook(look);
    loop().invalidate();
  };

interface Parts {
  readonly world: World;
  readonly view: ViewState;
  readonly set: (look: Look) => void;
  readonly loop: Loop;
  readonly teardown: () => void;
}

/** What the panel holds: update, draw again, free. */
export const controller = (
  { world, view, set, loop, teardown }: Parts,
): TerrainScene => ({
  update: (next: SceneInput): void => {
    if (next.mode !== view.mode) {
      view.mode = next.mode;
      view.home = startLook(next.mode, view.look.yawDeg);
      set(view.home);
    }
    applyInput(world, next);
    loop.invalidate();
  },
  invalidate: (): void => loop.invalidate(),
  dispose: teardown,
});
