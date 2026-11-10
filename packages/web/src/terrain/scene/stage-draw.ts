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
 * How a stage draws a frame: one render of the scene, or the split draw's
 * two passes (depth-passes.ts) when the depth mode is `split` (VENT-114).
 * The Sun's shadow map is asked for here, before the render that draws it.
 */
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { isSplit, type DepthMode } from '../depth-mode';
import { drawSplit, type DrawCost } from './depth-passes';
import type { ShadowGate } from './shadow-gate';

export interface StageDraw {
  /** Whether the frame is the split draw's two passes. */
  readonly split: boolean;
  /** Draws a frame. */
  readonly draw: () => void;
  /** What the last frame drew, all passes together. */
  readonly cost: () => DrawCost;
}

/** The draw of `scene` seen by `camera` for the depth `mode`. */
export function stageDraw(
  parts: {
    readonly renderer: WebGLRenderer;
    readonly scene: Scene;
    readonly camera: PerspectiveCamera;
    readonly shadow: ShadowGate;
  },
  mode: DepthMode,
): StageDraw {
  const { renderer, scene, camera, shadow } = parts;
  if (!isSplit(mode)) {
    return { split: false, cost: () => renderer.info.render, draw: () => {
      shadow.beforeDraw();
      renderer.render(scene, camera);
    } };
  }
  let last: DrawCost = { calls: 0, triangles: 0 };
  return { split: true, cost: () => last, draw: () => {
    last = drawSplit({ renderer, scene, camera,
      beforeNear: () => shadow.beforeDraw() });
  } };
}
