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
 * dynamic import, so the scene's code downloads only when the view opens
 * (and is left out of the service worker's precache). It draws only on
 * change (a turn, a new instant, a resize, the band moving): an idle view
 * draws no frames. With `?debug` the dev tools'
 * readout reads its renderer while it is mounted (globe/dev-hook.ts).
 */
import { attachDevTools } from '../../globe/dev-hook';
import { createLoop, type Loop } from '../../globe/loop';
import { isPhoneViewport } from '../../lib/viewport';
import { startLook } from '../view-camera';
import { markSetup, startLoading } from './scene-loading';
import { bindHost, reducedMotion } from './scene-host';
import { pacedSchedule } from './turn-pace';
import { framer, type ViewState } from './scene-frame';
import { controller, homer, turner } from './scene-controller';
import { guardLost } from './scene-guard';
import { reportStage } from './scene-report';
import type {
  SceneHooks,
  SceneInput,
  SceneSetup,
  TerrainScene,
} from './scene-types';
import { setFine } from './ground-fine';
import { withNewPoints } from './scene-point';
import { gateLoop } from './loop-gate';
import { createStage, disposeStage } from './stage';
import { applyInput, createWorld, type World } from './world';
import { createWalker } from './walk';
import { followEye, resetEye } from './walk-move';

/** The world on a new stage in `host`; throws without WebGL. */
function stageWorld(host: HTMLElement, seed: number, setup: SceneSetup) {
  const stage = createStage(host, setup, isPhoneViewport());
  return createWorld(stage, seed, setup);
}

/**
 * Tells the panel whether the scanned rocks' files loaded (VENT-124), so the
 * caption credits them only when they are drawn; nothing for the stones.
 */
function tellScans(world: World, hooks: SceneHooks): void {
  world.scans?.assets.then(() => hooks.onScans?.(true),
    () => hooks.onScans?.(false));
}

/** The world, the view's state and the loop that draws them. */
function openScene(host: HTMLElement, input: SceneInput, hooks: SceneHooks,
  setup: SceneSetup) {
  const world = stageWorld(host, input.seed, setup);
  reportStage(world);
  tellScans(world, hooks);
  const home = startLook(input.startYawDeg);
  const view: ViewState = { look: home, home, coast: null, homing: null,
    dragging: false, told: false, eye: [0, 0], glide: null, edge: false,
    fading: false };
  const walking = { world, view, host, reducedMotion };
  const walker = createWalker(walking);
  world.tellEye = () => hooks.onEye?.({ at: world.eye, edge: view.edge,
    sight: world.sight });
  const { labels, frame } = framer({ ...walking, hooks,
    marker: walker.marker });
  const pace = pacedSchedule({ raf: requestAnimationFrame,
    cancel: cancelAnimationFrame,
    turning: () => isPhoneViewport() && !reducedMotion() &&
      (view.dragging || view.coast !== null) });
  const loop = gateLoop(createLoop(frame, pace.schedule, pace.cancel));
  world.invalidate = () => loop.invalidate();
  return { world, view, labels, loop, walker, walking };
}

/** What undoes a mounted scene, in order, and frees its GPU last. */
function freeScene(parts: { world: World;
  labels: { root: ChildNode; stop: () => void };
  loop: Loop; steps: readonly (() => void)[] }): () => void {
  return () => {
    for (const undo of parts.steps) undo();
    parts.loop.stop();
    parts.labels.stop();
    parts.labels.root.remove();
    parts.world.slicer.clear();
    parts.world.rings?.dispose();
    parts.world.craters?.dispose();
    parts.world.clods?.dispose();
    parts.world.ringDepth?.dispose();
    setFine(parts.world.fine, null);
    disposeStage(parts.world.stage);
  };
}

export function mountTerrainScene(
  host: HTMLElement,
  input: SceneInput,
  hooks: SceneHooks,
  setup: SceneSetup,
): TerrainScene {
  const { world, view, labels, loop, walker, walking } =
    openScene(host, input, hooks, setup);
  const set = turner(view, hooks, () => loop);
  const goHome = homer(view, set, () => loop);
  applyInput(world, input);
  followEye(walking);
  const unbind = bindHost(host, world, view, { set, goHome, walker });
  markSetup(host, setup);
  const unmark = startLoading(host, world, loop, hooks);
  const unwatch = guardLost({ canvas: world.stage.renderer.domElement,
    labels, loop, report: setup.report, onLost: hooks.onLost });
  const tools = attachDevTools(world.stage.renderer, 'onFoot');
  const teardown = freeScene({ world, labels, loop,
    steps: [tools, unwatch, unmark, unbind, walker.dispose] });
  const scene = controller({ world, loop, home: goHome, teardown,
    back: walker.back });
  return withNewPoints(scene, { view, loop, set, seed: input.seed,
    resetEye: () => resetEye(walking) });
}
