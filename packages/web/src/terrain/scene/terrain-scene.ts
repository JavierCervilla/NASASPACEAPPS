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
 * band moving): an idle view draws no frames. With `?debug` the dev tools'
 * readout reads its renderer while it is mounted (globe/dev-hook.ts).
 */
import { attachDevTools } from '../../globe/dev-hook';
import { createLoop, type Loop } from '../../globe/loop';
import { isPhoneViewport } from '../../lib/viewport';
import { startLook } from '../view-camera';
import { markSetup, startLoading } from './scene-loading';
import { bindHost, reducedMotion } from './scene-host';
import { framer, type ViewState } from './scene-frame';
import { controller, turner } from './scene-controller';
import { guardLost } from './scene-guard';
import { reportStage } from './scene-report';
import type {
  SceneHooks,
  SceneInput,
  SceneSetup,
  TerrainScene,
} from './scene-types';
import { createStage, disposeStage } from './stage';
import { applyInput, createWorld, type World } from './world';

/** The world on a new stage in `host`; throws without WebGL. */
function stageWorld(host: HTMLElement, seed: number, setup: SceneSetup) {
  const stage = createStage(host, setup, isPhoneViewport());
  return createWorld(stage, seed, setup);
}

/** The world, the view's state and the loop that draws them. */
function openScene(host: HTMLElement, input: SceneInput, hooks: SceneHooks,
  setup: SceneSetup) {
  const world = stageWorld(host, input.seed, setup);
  reportStage(world);
  const home = startLook(input.mode, input.startYawDeg);
  const view: ViewState = { mode: input.mode, look: home, home, coast: null };
  const { labels, frame } = framer(world, host, hooks, view);
  const loop = createLoop(frame);
  world.invalidate = () => loop.invalidate();
  return { world, view, labels, loop };
}

/** What undoes a mounted scene, in order, and frees its GPU last. */
function freeScene(parts: { world: World; labels: { root: ChildNode };
  loop: Loop; steps: readonly (() => void)[] }): () => void {
  return () => {
    for (const undo of parts.steps) undo();
    parts.loop.stop();
    parts.labels.root.remove();
    parts.world.slicer.clear();
    parts.world.rings?.dispose();
    disposeStage(parts.world.stage);
  };
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
  const unwatch = guardLost({ canvas: world.stage.renderer.domElement,
    labels, loop, report: setup.report, onLost: hooks.onLost });
  const tools = attachDevTools(world.stage.renderer);
  const teardown = freeScene({ world, labels, loop,
    steps: [tools, unwatch, unmark, unbind] });
  return controller({ world, view, set, loop, teardown });
}
