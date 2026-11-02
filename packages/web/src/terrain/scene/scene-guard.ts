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
 * What guards the on-foot scene's GPU (VENT-49): the loss of its context,
 * which the panel answers by freeing the scene and saying so, and the frame
 * probe that, while the view loads, steps it down a tier when a frame costs
 * more than the tier can afford.
 */
import type { WebGLRenderer } from 'three';
import type { QualitySettings } from '../../lib/quality';
import { budgetOf, createFrameProbe, type FrameProbe } from '../frame-probe';

/** Tells `onLost` when the browser takes the canvas's context; unbinds. */
export function watchLost(
  canvas: EventTarget,
  onLost: () => void,
): () => void {
  canvas.addEventListener('webglcontextlost', onLost);
  return () => canvas.removeEventListener('webglcontextlost', onLost);
}

/**
 * The probe for `renderer`'s frames: the GPU is waited on by reading one
 * pixel back. With no `onSlow` it only draws.
 */
export function stageProbe(
  renderer: Pick<WebGLRenderer, 'getContext' | 'info'>,
  quality: QualitySettings,
  onSlow: (() => void) | undefined,
): FrameProbe {
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  return createFrameProbe({
    budgetMs: budgetOf(quality.targetFps),
    now: () => performance.now(),
    sync: () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel),
    programs: () => renderer.info.programs?.length ?? 0,
    onSlow,
  });
}
