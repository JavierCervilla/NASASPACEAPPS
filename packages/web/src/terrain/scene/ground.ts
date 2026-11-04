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
 * The measured ground's material (VENT-34, VENT-46): shared by every tile
 * of the relief rings (ring-layer.ts), the Sun's mask per vertex
 * (sun-shade.ts), and the regolith as a physically based
 * material: CC0 photographs of lunar regolith (Poly
 * Haven, ASSETS.md), albedo and normal, tiled at walking scale and varied
 * so they do not repeat (ground-shader.ts). Illustrative fine detail, as
 * the caption says; the relief it lies on is LOLA's.
 */
import { MeshStandardMaterial, Vector2 } from 'three';
import { groundKey, type GroundPolicy } from '../ground-policy';
import { patchFine, type FineUniforms } from './ground-fine';
import { patchPhotometry } from './ground-photometry';
import { antiTile } from './ground-shader';
import type { SurfaceMaps } from './surface-maps';
import { maskSun, type SunMask } from './sun-mask';

/** Regolith is near fully rough; its albedo is a dark grey (about 0.12). */
const ROUGHNESS = 0.96;
const NORMAL_STRENGTH = 0.55;

/**
 * The ground's material, its parts as `policy` allows (VENT-69); its maps
 * come with {@link attachGroundMaps}.
 */
export function groundMaterial(
  mask: SunMask,
  fine: FineUniforms,
  policy: GroundPolicy,
): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: 0xcfcfcf,
    roughness: ROUGHNESS, metalness: 0 });
  material.normalScale = new Vector2(NORMAL_STRENGTH, NORMAL_STRENGTH);
  maskSun(material, mask, true);
  const masked = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    masked.call(material, shader, renderer);
    antiTile(shader, policy);
    if (policy.fine) patchFine(shader, fine);
    if (policy.photometry) patchPhotometry(shader);
  };
  material.customProgramCacheKey = () => groundKey(policy);
  return material;
}

/** Puts the photographed regolith on `material` (compiled once more). */
export function attachGroundMaps(
  material: MeshStandardMaterial,
  maps: SurfaceMaps,
): void {
  material.map = maps.albedo;
  material.normalMap = maps.normal;
  material.needsUpdate = true;
}
