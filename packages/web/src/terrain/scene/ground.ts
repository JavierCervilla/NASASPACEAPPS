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
 * per vertex (sun-shade.ts), and the illustrative regolith grain
 * (regolith.ts) as a normal map and an albedo grain. Lambert, as the
 * globe, so no new material class joins the chunk it loads at start:
 * regolith is near fully rough, and the grain stands for its roughness.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearMipmapLinearFilter,
  Mesh,
  MeshLambertMaterial,
  RepeatWrapping,
  type Scene,
} from 'three';
import { regolithMaps } from '../regolith';
import { tileBuffers } from '../tile-mesh';
import type { PlacedTile } from './scene-types';
import { maskSun, type SunMask } from './sun-mask';

/** Metres one repeat of the grain covers. */
const GRAIN_M = 3;
const GRAIN_PX = 256;

/** A wrapping, mipmapped texture over `data`. */
function grainTexture(data: Uint8Array): DataTexture {
  const texture = new DataTexture(data, GRAIN_PX, GRAIN_PX);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** The ground's material, its grain from `seed`, the Sun masked. */
export function groundMaterial(seed: number, mask: SunMask) {
  const maps = regolithMaps(seed, GRAIN_PX);
  const material = new MeshLambertMaterial({
    color: 0xa6a39e,
    normalMap: grainTexture(maps.normal),
    map: grainTexture(maps.roughness),
  });
  maskSun(material, mask, true);
  return material;
}

/** The mesh of `placed`, with `lit` as its Sun mask. */
export function tileMesh(
  placed: PlacedTile,
  lit: Float32Array,
  material: MeshLambertMaterial,
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
