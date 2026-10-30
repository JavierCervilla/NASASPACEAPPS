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
 * The Three.js stage: renderer, scene and camera, sized to its host. The
 * canvas is transparent, so the section's dark sky shows through.
 */
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { QualitySettings } from '../lib/quality';
import { cameraPosition, FOV_DEG, type OrbitPose } from './framing';

export interface Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

/**
 * A stage drawing into a new canvas appended to `host`. Throws when the
 * browser has no WebGL.
 */
export function createStage(
  host: HTMLElement,
  quality: QualitySettings,
): Stage {
  const renderer = new WebGLRenderer({
    antialias: quality.antialias,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  const camera = new PerspectiveCamera(FOV_DEG, 1, 0.1, 100);
  return { renderer, scene: new Scene(), camera };
}

/** Fits the drawing buffer to `width` x `height` px. */
export function resizeStage(stage: Stage, width: number, height: number) {
  stage.renderer.setSize(width, height);
}

/**
 * Where the Moon is framed inside the canvas: a band `frameHeight` px tall
 * whose top sits `top` px below the canvas's top, as wide as the canvas.
 */
export interface StageFrame {
  /** The canvas, in CSS px. */
  readonly width: number;
  readonly height: number;
  readonly frameHeight: number;
  readonly top: number;
}

/**
 * Aims the projection so the Moon is centred and scaled for the frame,
 * while the whole canvas still draws: the field of view spans the frame,
 * and the canvas is a window onto it (a view offset), so moving the frame
 * moves the Moon without a gap and without changing the zoom.
 */
export function frameCamera(camera: PerspectiveCamera, frame: StageFrame) {
  const width = Math.max(frame.width, 1);
  const frameHeight = Math.max(frame.frameHeight, 1);
  const height = Math.max(frame.height, 1);
  camera.setViewOffset(width, frameHeight, 0, -frame.top, width, height);
}

/** Puts the camera at `pose`, looking at the Moon's centre, north up. */
export function aimCamera(camera: PerspectiveCamera, pose: OrbitPose) {
  const { x, y, z } = cameraPosition(pose);
  camera.position.set(x, y, z);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
}

/** Frees the GPU context and takes the canvas off the page. */
export function disposeStage(stage: Stage): void {
  stage.renderer.dispose();
  stage.renderer.forceContextLoss();
  stage.renderer.domElement.remove();
}
