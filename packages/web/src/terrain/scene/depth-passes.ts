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
 * The split draw (VENT-114): the view in two passes of linear depth, so a
 * GPU that loses its context with a logarithmic or reversed depth and the
 * shadow map (VENT-75) draws both. A 24-bit linear buffer cannot span 0.2 m
 * to the sky, so each pass gets the planes that fit its own range:
 *
 * 1. FAR: ring levels 2 and 3, the far horizon's wall and the sky (stars,
 *    Sun, Earth, 450 to 900 km), planes {@link FAR_PLANES};
 * 2. the depth buffer is cleared, the colour is kept;
 * 3. NEAR: ring levels 0 and 1, the near ground, rocks and craters, planes
 *    {@link NEAR_PLANES}, with the Sun's shadow map.
 *
 * The near pass is painted over the far one whole: a pixel the near ground
 * covers is never the far relief's, since the windows nest (a level draws
 * where the finer one does not, ring-window.ts) and a ray leaves the nearer
 * window once. Which pass an object is in is its three.js layer; the lights
 * are on both, so both passes build the same programs.
 */
import type {
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

/** The near pass is three's default layer, so what is unmarked is near. */
export const NEAR_LAYER = 0;
export const FAR_LAYER = 1;

/** The first ring level that is drawn in the far pass. */
export const FAR_FROM_LEVEL = 2;

export interface Planes {
  readonly near: number;
  readonly far: number;
}

/**
 * The full range the stage's camera keeps for everything else that reads
 * it (labels, the bodies' place on screen): the sky's stars end at 900 km.
 */
export const FULL_PLANES: Planes = { near: 0.2, far: 1_200_000 };

/**
 * Level 1's window is 16 km across, 11.3 km to its corner and up to 0.25
 * km more when it is aligned to level 2's cells; 12.5 km holds it whole.
 */
export const NEAR_PLANES: Planes = { near: FULL_PLANES.near, far: 12_500 };

/**
 * The far pass starts at 1 km: level 2 draws nearer only where a level 1
 * tile failed, which is a hole already, and at 190 km a linear 24-bit
 * buffer then resolves 2 m, under the far rings' 250 m to 1 km nodes.
 */
export const FAR_PLANES: Planes = { near: 1000, far: FULL_PLANES.far };

/** What a pass or a frame drew. */
export interface DrawCost {
  readonly calls: number;
  readonly triangles: number;
}

/**
 * Puts `object` and what hangs from it in the far pass. A light stays in
 * both, so the two passes light the same way and build the same programs.
 */
export function sendFar(object: Object3D): void {
  object.traverse((o) => {
    if ((o as { isLight?: boolean }).isLight) o.layers.enable(FAR_LAYER);
    else o.layers.set(FAR_LAYER);
  });
}

/** `object` sent to the far pass when the draw is `split`; `object`. */
export function farWhen<T extends Object3D>(split: boolean, object: T): T {
  if (split) sendFar(object);
  return object;
}

export interface SplitDraw {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Asks the Sun's shadow map for the near pass, which is its alone. */
  readonly beforeNear: () => void;
}

/** One render of `layer` with `planes`; what it drew. */
function pass(d: SplitDraw, layer: number, planes: Planes): DrawCost {
  const { renderer, camera } = d;
  const { info } = renderer;
  const was = { calls: info.render.calls, triangles: info.render.triangles };
  camera.layers.set(layer);
  Object.assign(camera, planes);
  camera.updateProjectionMatrix();
  renderer.render(d.scene, camera);
  // Three resets the counts at each render unless something else (the dev
  // tools) has taken that over and adds them up.
  const base = info.autoReset ? { calls: 0, triangles: 0 } : was;
  return { calls: info.render.calls - base.calls,
    triangles: info.render.triangles - base.triangles };
}

/** Draws the far pass, clears the depth, draws the near pass over it. */
export function drawSplit(d: SplitDraw): DrawCost {
  const { renderer, camera } = d;
  const keepColour = renderer.autoClearColor;
  try {
    const far = pass(d, FAR_LAYER, FAR_PLANES);
    // The depth is cleared by the next render; the colour must stay.
    renderer.autoClearColor = false;
    d.beforeNear();
    const near = pass(d, NEAR_LAYER, NEAR_PLANES);
    return { calls: far.calls + near.calls,
      triangles: far.triangles + near.triangles };
  } finally {
    renderer.autoClearColor = keepColour;
    camera.layers.set(NEAR_LAYER);
    Object.assign(camera, FULL_PLANES);
    camera.updateProjectionMatrix();
  }
}
