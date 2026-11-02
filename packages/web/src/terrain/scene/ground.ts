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
 * The measured ground (VENT-34): one mesh per tile, kept by the tile's
 * key so tiles can later come and go side by side, each freed when it
 * leaves. Geometry from the pure buffers (tile-mesh.ts), the Sun's mask
 * per vertex (sun-shade.ts), and the regolith as a physically based
 * material: CC0 photographs of lunar regolith (Poly
 * Haven, ASSETS.md), albedo and normal, tiled at walking scale and varied
 * so they do not repeat (ground-shader.ts). Illustrative fine detail, as
 * the caption says; the relief it lies on is LOLA's.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  type Scene,
} from 'three';
import { tileBuffers } from '../tile-mesh';
import { antiTile } from './ground-shader';
import type { SurfaceMaps } from './surface-maps';
import type { PlacedTile } from './scene-types';
import { maskSun, type SunMask } from './sun-mask';

/** Metres one repeat of the regolith photograph covers. */
const GRAIN_M = 3.5;
/** Regolith is near fully rough; its albedo is a dark grey (about 0.12). */
const ROUGHNESS = 0.96;
const NORMAL_STRENGTH = 0.55;

/** The ground's material; its maps come with {@link attachGroundMaps}. */
export function groundMaterial(mask: SunMask): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: 0xcfcfcf,
    roughness: ROUGHNESS, metalness: 0 });
  material.normalScale = new Vector2(NORMAL_STRENGTH, NORMAL_STRENGTH);
  maskSun(material, mask, true);
  const masked = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    masked.call(material, shader, renderer);
    antiTile(shader);
  };
  material.customProgramCacheKey = () => 'sun-tile-regolith';
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

/** The mesh of `placed`, with `lit` as its Sun mask. */
export function tileMesh(
  placed: PlacedTile,
  lit: Float32Array,
  material: MeshStandardMaterial,
): Mesh {
  const { positions, normals, index } = tileBuffers(placed.tile, placed.ys);
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0; i < uv.length / 2; i++) {
    uv[i * 2] = (positions[i * 3] ?? 0) / GRAIN_M;
    uv[i * 2 + 1] = (positions[i * 3 + 2] ?? 0) / GRAIN_M;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('lit', new BufferAttribute(lit, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = mesh.castShadow = true;
  mesh.name = placed.tile.key;
  return mesh;
}

/** Takes the tile `key`'s mesh off `scene` and frees its geometry. */
export function dropTile(scene: Scene, key: string): void {
  const mesh = scene.getObjectByName(key) as Mesh | undefined;
  if (!mesh) return;
  scene.remove(mesh);
  mesh.geometry.dispose();
}
