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
import { depthStep } from '../depth-mode';
import { unmaskedGpuName } from '../report/environment';
import { shadowMapUnsafe } from '../shadow-safety';
import type { SceneSetup } from './scene-types';

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
  renderer.shadowMap.enabled = !leave.has('shadows') && (depth.forceShadows
    || !shadowMapUnsafe(unmaskedGpuName(renderer.getContext()), phone));
  setup.report.step(depthStep(depth, renderer));
  return renderer;
}
