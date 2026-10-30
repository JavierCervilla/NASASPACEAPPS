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

/** Fits the drawing buffer and the camera to `width` x `height` px. */
export function resizeStage(stage: Stage, width: number, height: number) {
  stage.renderer.setSize(width, height);
  stage.camera.aspect = width / Math.max(height, 1);
  stage.camera.updateProjectionMatrix();
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
