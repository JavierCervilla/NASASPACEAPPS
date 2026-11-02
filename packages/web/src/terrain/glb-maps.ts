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
 * The textures of a glTF material (VENT-46), read without GLTFLoader: the
 * baked models name their maps by URI through EXT_texture_webp, files
 * beside the glb (the page's CSP loads no `blob:` image), so a map is a
 * name and how it wraps, and the scene fetches it. Pure: JSON in, plain
 * objects out.
 */

/** glTF's CLAMP_TO_EDGE; anything else (or none) repeats. */
const CLAMP = 33071;

/** One texture slot: the file's name and whether it clamps. */
export interface GlbMap {
  readonly uri: string;
  readonly clamp: boolean;
  /** The normal map's strength; 1 elsewhere. */
  readonly scale: number;
}

/** The slots of a material (null: the slot is empty). */
export interface GlbMaps {
  readonly map: GlbMap | null;
  readonly normal: GlbMap | null;
  readonly occlusion: GlbMap | null;
  readonly metalRough: GlbMap | null;
}

interface Slot {
  readonly index: number;
  readonly scale?: number;
}

export interface GlbMaterialJson {
  readonly normalTexture?: Slot;
  readonly occlusionTexture?: Slot;
  readonly pbrMetallicRoughness?: {
    readonly baseColorFactor?: number[];
    readonly roughnessFactor?: number;
    readonly metallicFactor?: number;
    readonly baseColorTexture?: Slot;
    readonly metallicRoughnessTexture?: Slot;
  };
}

export interface MapsJson {
  readonly materials: readonly GlbMaterialJson[];
  readonly textures?: readonly { readonly source?: number;
    readonly sampler?: number;
    readonly extensions?: { readonly EXT_texture_webp?: {
      readonly source: number } } }[];
  readonly images?: readonly { readonly uri?: string }[];
  readonly samplers?: readonly { readonly wrapS?: number;
    readonly wrapT?: number }[];
}

function mapAt(json: MapsJson, slot: Slot | undefined): GlbMap | null {
  const texture = slot ? json.textures?.[slot.index] : undefined;
  const source = texture?.extensions?.EXT_texture_webp?.source ??
    texture?.source;
  const uri = source === undefined ? undefined : json.images?.[source]?.uri;
  if (!texture || uri === undefined) return null;
  const sampler = json.samplers?.[texture.sampler ?? -1];
  const clamp = sampler?.wrapS === CLAMP && sampler.wrapT === CLAMP;
  return { uri, clamp, scale: slot?.scale ?? 1 };
}

/** The maps material `i` wears. */
export function mapsOf(json: MapsJson, i: number): GlbMaps {
  const material = json.materials[i];
  const pbr = material?.pbrMetallicRoughness;
  return {
    map: mapAt(json, pbr?.baseColorTexture),
    normal: mapAt(json, material?.normalTexture),
    occlusion: mapAt(json, material?.occlusionTexture),
    metalRough: mapAt(json, pbr?.metallicRoughnessTexture),
  };
}
