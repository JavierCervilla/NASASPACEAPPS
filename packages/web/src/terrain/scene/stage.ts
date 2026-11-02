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
 * The on-foot scene's stage (VENT-34): renderer with hard shadows, scene
 * and camera, the pixel ratio capped by the device's quality tier, sized
 * to its host; drawn by a band of the host when one is given.
 */
import {
  NeutralToneMapping,
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
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.maxPixelRatio));
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  const fov = phone ? FOV.phone : FOV.wide;
  const camera = new PerspectiveCamera(fov, 1, 0.2, 120_000);
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
  material.dispose();
}
