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
 * The on-foot view's renderer, made with the depth buffer and the shadow map
 * the address may choose to bisect a GPU crash (VENT-103, depth-mode.ts).
 */
import type { WebGLRenderer } from 'three';
import { createGlRenderer } from '../../lib/gl-renderer';
import { depthDrawn, depthStep } from '../depth-mode';
import { unmaskedGpuName } from '../report/environment';
import {
  shadowMapState, writeSceneMarks, type ShadowMapState,
} from '../scene-marks';
import { shadowMapUnsafe } from '../shadow-safety';
import type { SceneSetup } from './scene-types';

/**
 * Writes on the canvas what the renderer was made with, for the `?debug`
 * readout to read from the scene and not from the address (VENT-105).
 */
function markDrawn(
  renderer: WebGLRenderer,
  setup: SceneSetup,
  shadows: ShadowMapState,
): void {
  const { mode, bits, reversed } = depthDrawn(setup.depth, renderer);
  writeSceneMarks(renderer.domElement,
    { depth: mode, bits, reversed, shadows, tier: setup.quality.tier });
}

/**
 * The stage's renderer, with the depth buffer and shadow map the setup chose
 * (depth-mode.ts), which it notes in the report.
 */
export function stageRenderer(
  setup: SceneSetup,
  phone: boolean,
): WebGLRenderer {
  const { quality, leave, depth } = setup;
  const renderer = createGlRenderer({
    antialias: quality.antialias,
    powerPreference: 'low-power',
    // The rings reach 190 km and the sky is farther: a linear depth buffer
    // would z-fight at 100 km with a near plane of 0.2 m. `?depth=` and
    // `?onfoot=logdepth` change it to bisect a crash, accepting that.
    logarithmicDepthBuffer: depth.mode === 'log',
    reversedDepthBuffer: depth.mode === 'reversed',
  });
  const shadows = shadowMapState({ leftOut: leave.has('shadows'),
    forced: depth.forceShadows,
    unsafe: shadowMapUnsafe(unmaskedGpuName(renderer.getContext()), phone) });
  renderer.shadowMap.enabled = shadows === 'on' || shadows === 'forced';
  setup.report.step(depthStep(depth, renderer));
  markDrawn(renderer, setup, shadows);
  return renderer;
}
