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
 * The on-foot 3D view's scene (VENT-34), the entry the panel loads with a
 * dynamic import, so the scene's code and the astronaut download only
 * when the view opens (and are left out of the service worker's
 * precache). It draws only on change (a turn, a new instant, a resize, the
 * band moving): an idle view draws no frames.
 */
import { createLoop } from '../../globe/loop';
import { pickQuality } from '../../globe/quality-pick';
import { isPhoneViewport } from '../../lib/viewport';
import { startLook, type Look } from '../view-camera';
import { loadAstronaut } from './astronaut';
import { bindLook } from './controls';
import { framer, type ViewState } from './scene-frame';
import { controller, turner } from './scene-controller';
import type { SceneHooks, SceneInput, TerrainScene } from './scene-types';
import { createStage, disposeStage } from './stage';
import { applyInput, createWorld, type World } from './world';

/** The world on a new stage in `host`; throws without WebGL. */
function stageWorld(host: HTMLElement, seed: number): World {
  const phone = isPhoneViewport();
  const quality = pickQuality(phone);
  const stage = createStage(host, quality, phone);
  return createWorld(stage, seed, quality.tier === 'high' ? 2048 : 1024);
}

/** Binds the controls and the host's size; returns the unbind. */
function bindHost(host: HTMLElement, world: World, view: ViewState,
  set: (look: Look) => void): () => void {
  const { camera } = world.stage;
  const unbind = bindLook(host, { mode: () => view.mode, set,
    look: () => view.look, home: () => view.home,
    degPerPx: () => camera.fov / Math.max(host.clientHeight, 1) });
  const observer = new ResizeObserver(() => set(view.look));
  observer.observe(host);
  return () => {
    unbind();
    observer.disconnect();
  };
}

/** Mounts the view in `host` with `input`; throws without WebGL. */
export function mountTerrainScene(
  host: HTMLElement,
  input: SceneInput,
  hooks: SceneHooks,
): TerrainScene {
  const world = stageWorld(host, input.seed);
  const home = startLook(input.mode, input.startYawDeg);
  const view: ViewState = { mode: input.mode, look: home, home };
  const { labels, frame } = framer(world, host, hooks, view);
  const loop = createLoop(frame);
  const set = turner(view, hooks, () => loop);
  applyInput(world, input);
  const unbind = bindHost(host, world, view, set);
  void loadAstronaut(world.astronaut, world.mask, console.warn).then(() => {
    host.dataset['ready'] = 'true';
    loop.invalidate();
  });
  const teardown = (): void => {
    loop.stop();
    unbind();
    labels.root.remove();
    disposeStage(world.stage);
  };
  return controller({ world, view, set, loop, teardown });
}
