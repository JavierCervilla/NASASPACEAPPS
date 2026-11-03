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
 * turning it back to where it opened (the compass and Home, VENT-63),
 * taking a new input (a new instant, tiles), drawing again and freeing it
 * all.
 */
import type { Loop } from '../../globe/loop';
import { homingOf } from '../look-home';
import type { Look } from '../view-camera';
import type { ViewState } from './scene-frame';
import { reducedMotion } from './scene-host';
import type { SceneHooks, SceneInput, TerrainScene } from './scene-types';
import { applyInput, type World } from './world';

/** Turns the view to `look` and asks for a frame. */
export const turner = (view: ViewState, hooks: SceneHooks, loop: () => Loop) =>
  (look: Look): void => {
    view.look = look;
    hooks.onLook(look);
    loop().invalidate();
  };

/**
 * Turns the view back to where it opened: on springs that the frames carry,
 * or at once under reduced motion. Any coast stops.
 */
export const homer = (view: ViewState, set: (look: Look) => void,
  loop: () => Loop) => (): void => {
  view.coast = null;
  view.homing = reducedMotion() ? null : homingOf(view.look, view.home);
  if (view.homing) loop().invalidate();
  else set(view.home);
};

interface Parts {
  readonly world: World;
  readonly loop: Loop;
  readonly home: () => void;
  readonly teardown: () => void;
}

/** What the panel holds: update, go home, draw again, free. */
export const controller = (
  { world, loop, home, teardown }: Parts,
): TerrainScene => ({
  home,
  update: (next: SceneInput): void => {
    if (applyInput(world, next)) loop.invalidate();
  },
  invalidate: (): void => loop.invalidate(),
  dispose: teardown,
});
