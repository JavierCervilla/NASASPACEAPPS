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
import { isPhoneViewport } from '../../lib/viewport';
import { coastOf } from '../look-coast';
import { dragScale } from '../look-input';
import { startLook, type Look } from '../view-camera';
import { bindLook } from './controls';
import { markSetup, startLoading } from './scene-loading';
import { framer, type ViewState } from './scene-frame';
import { controller, turner } from './scene-controller';
import { watchLost } from './scene-guard';
import type {
  SceneHooks,
  SceneInput,
  SceneSetup,
  TerrainScene,
} from './scene-types';
import { createStage, disposeStage } from './stage';
import { applyInput, createWorld, type World } from './world';

/** Whether the person asked for less motion. */
const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The world on a new stage in `host`; throws without WebGL. */
function stageWorld(host: HTMLElement, seed: number, setup: SceneSetup) {
  const stage = createStage(host, setup, isPhoneViewport());
  return createWorld(stage, seed, setup);
}

/** Binds the controls and the host's size; returns the unbind. */
function bindHost(host: HTMLElement, world: World, view: ViewState,
  set: (look: Look) => void): () => void {
  const { camera } = world.stage;
  const unbind = bindLook(host, { mode: () => view.mode, set,
    look: () => view.look, home: () => view.home,
    scale: () => dragScale(host.clientWidth, host.clientHeight, camera.fov),
    fling: (vx, vy) => {
      const scale = dragScale(host.clientWidth, host.clientHeight, camera.fov);
      view.coast = coastOf({ x: vx, y: vy }, scale, reducedMotion());
      if (view.coast) world.invalidate();
    },
    halt: () => void (view.coast = null) });
  const observer = new ResizeObserver(() => set(view.look));
  observer.observe(host);
  return () => {
    unbind();
    observer.disconnect();
  };
}

/** The world, the view's state and the loop that draws them. */
function openScene(host: HTMLElement, input: SceneInput, hooks: SceneHooks,
  setup: SceneSetup) {
  const world = stageWorld(host, input.seed, setup);
  const home = startLook(input.mode, input.startYawDeg);
  const view: ViewState = { mode: input.mode, look: home, home, coast: null };
  const { labels, frame } = framer(world, host, hooks, view);
  const loop = createLoop(frame);
  world.invalidate = () => loop.invalidate();
  return { world, view, labels, loop };
}

export function mountTerrainScene(
  host: HTMLElement,
  input: SceneInput,
  hooks: SceneHooks,
  setup: SceneSetup,
): TerrainScene {
  const { world, view, labels, loop } = openScene(host, input, hooks, setup);
  const set = turner(view, hooks, () => loop);
  applyInput(world, input);
  const unbind = bindHost(host, world, view, set);
  markSetup(host, setup);
  const unmark = startLoading(host, world, loop, reducedMotion);
  const unwatch = watchLost(world.stage.renderer.domElement, hooks.onLost);
  const teardown = (): void => {
    unwatch();
    unmark();
    loop.stop();
    unbind();
    labels.root.remove();
    disposeStage(world.stage);
  };
  return controller({ world, view, set, loop, teardown });
}
