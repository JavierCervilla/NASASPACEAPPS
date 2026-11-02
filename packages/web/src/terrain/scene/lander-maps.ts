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
 * The maps of a baked model (VENT-46): every WebP its glb names, fetched
 * once however many materials share it, set up as the glTF says (not
 * flipped, wrapped or clamped as its sampler is, the colour map in sRGB
 * and the data maps linear).
 */
import {
  ClampToEdgeWrapping,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import type { GlbMap, GlbPrimitive } from '../glb';
import type { ModelFiles } from './model-files';

export type Maps = ReadonlyMap<string, Texture>;

const ANISOTROPY = 4;

interface Wanted {
  readonly clamp: boolean;
  readonly color: boolean;
}

/** The files the primitives' materials wear, by URI. */
function wantedBy(primitives: readonly GlbPrimitive[]): Map<string, Wanted> {
  const wanted = new Map<string, Wanted>();
  for (const { maps } of primitives) {
    const slots: [GlbMap | null, boolean][] = [[maps.map, true],
      [maps.normal, false], [maps.occlusion, false],
      [maps.metalRough, false]];
    for (const [map, color] of slots) {
      if (map) wanted.set(map.uri, { clamp: map.clamp, color });
    }
  }
  return wanted;
}

/** Fetches every map `primitives` name from `files`. */
export async function loadMaps(
  primitives: readonly GlbPrimitive[],
  files: ModelFiles,
): Promise<Maps> {
  const loader = new TextureLoader();
  const entries = await Promise.all([...wantedBy(primitives)].map(
    async ([uri, { clamp, color }]) => {
      const url = files.images[uri];
      if (!url) throw new Error(`no file for ${uri}`);
      const texture = await loader.loadAsync(url);
      texture.flipY = false;
      texture.anisotropy = ANISOTROPY;
      texture.wrapS = texture.wrapT = clamp ? ClampToEdgeWrapping
        : RepeatWrapping;
      if (color) texture.colorSpace = SRGBColorSpace;
      return [uri, texture] as const;
    }));
  return new Map(entries);
}
