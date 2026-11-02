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
 * The on-foot scene's stage (VENT-34): renderer with ACES filmic tone
 * mapping and hard shadows, scene and camera, the pixel ratio capped by
 * the device's quality tier, sized to its host; drawn by a band of the host
 * when one is given.
 */
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import type { QualitySettings } from '../../lib/quality';

export interface Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
}

/** Filmic exposure, fixed: sunlit regolith mid grey, the suit near white. */
const EXPOSURE = 1.35;
/**
 * The eye's adaptation when the Sun does not reach the point: the view
 * opens up, as a camera set for the dark would, instead of lighting it.
 */
const DARK_EXPOSURE = 2.8;

/** Vertical field of view, degrees: wider on a phone held upright. */
const FOV = { phone: 62, wide: 50 } as const;

/** A stage in a new canvas in `host`; throws without WebGL. */
export function createStage(
  host: HTMLElement,
  quality: QualitySettings,
  phone: boolean,
): Stage {
  const renderer = new WebGLRenderer({
    antialias: quality.antialias,
    powerPreference: 'low-power',
    // The rings reach 190 km and the sky is farther: a linear depth buffer
    // would z-fight at 100 km with a near plane of 0.2 m.
    logarithmicDepthBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.maxPixelRatio));
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  const fov = phone ? FOV.phone : FOV.wide;
  const camera = new PerspectiveCamera(fov, 1, 0.2, 1_200_000);
  return { renderer, scene: new Scene(), camera };
}

/**
 * Fits the drawing buffer to the host, and frames the projection in
 * `band` (px from the top) so the horizon sits in the part left visible.
 */
export function fitStage(
  stage: Stage,
  host: HTMLElement,
  band: { top: number; bottom: number } | null,
): void {
  const w = Math.max(host.clientWidth, 1);
  const h = Math.max(host.clientHeight, 1);
  stage.renderer.setSize(w, h, false);
  const top = band ? Math.max(band.top, 0) : 0;
  const bandH = band ? Math.max(band.bottom - top, 1) : h;
  stage.camera.aspect = w / bandH;
  stage.camera.setViewOffset(w, bandH, 0, -top, w, h);
  stage.camera.updateProjectionMatrix();
}

/** Frees every geometry, material and texture, then the GPU context. */
export function disposeStage(stage: Stage): void {
  stage.scene.traverse((object) => {
    const mesh = object as { geometry?: { dispose(): void };
      material?: { dispose(): void } | { dispose(): void }[] };
    mesh.geometry?.dispose();
    const materials = [mesh.material ?? []].flat();
    for (const material of materials) disposeMaterial(material);
  });
  stage.renderer.dispose();
  stage.renderer.forceContextLoss();
  stage.renderer.domElement.remove();
}

/** A material and the textures it holds. */
function disposeMaterial(material: { dispose(): void }): void {
  for (const value of Object.values(material)) {
    const texture = value as { isTexture?: boolean; dispose?: () => void };
    if (texture?.isTexture) texture.dispose?.();
  }
  // A shader material keeps its textures in its uniforms.
  const { uniforms } = material as { uniforms?: Record<string,
    { value?: { isTexture?: boolean; dispose?: () => void } | null }> };
  for (const uniform of Object.values(uniforms ?? {})) {
    if (uniform.value?.isTexture) uniform.value.dispose?.();
  }
  material.dispose();
}

/** The exposure for a point the Sun reaches (`lit`) or does not. */
export function exposureFor(lit: boolean): number {
  return lit ? EXPOSURE : DARK_EXPOSURE;
}
