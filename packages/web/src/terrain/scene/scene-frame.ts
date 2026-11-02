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
 * One frame of the on-foot scene (VENT-34): fit the stage to its host and
 * band, aim the camera at the look, draw, place the labels, and mark on
 * the host where the Sun and the Earth fall and how many frames were
 * drawn (`data-frames`, which the tests read: an idle view draws none).
 */
import { stepCoast, type Coast } from '../look-coast';
import type { CameraMode, Look } from '../view-camera';
import { aimCamera, markBodies } from './camera-apply';
import { labelLayer, type LabelLayer } from './labels';
import type { SceneHooks } from './scene-types';
import { fitStage } from './stage';
import type { World } from './world';

/** The camera's state, changed by the controls and the switch. */
export interface ViewState {
  mode: CameraMode;
  look: Look;
  home: Look;
  /** The swipe still carrying the look on (look-coast.ts), or none. */
  coast: Coast | null;
}

/** Carries the look on by `dt` seconds of the coast; true while it lasts. */
function coast(view: ViewState, dt: number, hooks: SceneHooks): boolean {
  if (!view.coast) return false;
  const next = stepCoast(view.mode, view.look, view.coast, dt);
  view.look = next.look;
  view.coast = next.coast;
  hooks.onLook(next.look);
  return next.coast !== null;
}

/** The labels' layer and the frame function for the scene's loop. */
export function framer(
  world: World,
  host: HTMLElement,
  hooks: SceneHooks,
  view: ViewState,
): { labels: LabelLayer; frame: (dt: number) => boolean } {
  const labels = labelLayer(host, world.stage.camera, () => world.ground);
  const frame = (dt: number): boolean => {
    const { stage } = world;
    const coasting = coast(view, dt, hooks);
    fitStage(stage, host, hooks.band?.() ?? null);
    aimCamera(world, view.mode, view.look);
    stage.renderer.render(stage.scene, stage.camera);
    if (world.input) labels.draw(world.input.words, view.look.yawDeg);
    markBodies(world, host);
    const { calls, triangles } = stage.renderer.info.render;
    host.dataset['draws'] = `${calls},${triangles}`;
    host.dataset['working'] = String(world.slicer.busy());
    const drawn = Number(host.dataset['frames'] ?? 0) + 1;
    host.dataset['frames'] = String(drawn);
    return coasting;
  };
  return { labels, frame };
}
