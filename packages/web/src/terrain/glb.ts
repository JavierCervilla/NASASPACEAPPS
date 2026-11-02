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
 * The little of glTF the astronaut needs (VENT-34), read without
 * GLTFLoader: the loader's animation and skinning classes would join the
 * Three.js chunk the globe loads at start. A binary glTF's JSON and BIN
 * chunks, and each primitive's indices, positions, normals and UVs with
 * their byte stride and normalisation (KHR_mesh_quantization), its
 * material's colour, roughness and metalness, and the node's scale and
 * translation.
 * Pure: arrays only; the scene makes the Three.js objects.
 */

const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const HEADER = 12;

/** An accessor's items, packed (de-interleaved). */
export interface GlbAccessor {
  readonly array: Int16Array | Uint16Array | Float32Array;
  readonly itemSize: number;
  readonly normalized: boolean;
}

export interface GlbPrimitive {
  readonly index: GlbAccessor;
  readonly position: GlbAccessor;
  readonly normal: GlbAccessor;
  /** The first texture coordinates (the suit's, laid out as glTF does). */
  readonly uv: GlbAccessor;
  readonly color: readonly [number, number, number];
  readonly roughness: number;
  readonly metalness: number;
}

export interface GlbModel {
  readonly primitives: readonly GlbPrimitive[];
  readonly scale: number;
  readonly translation: readonly [number, number, number];
}

interface Json {
  readonly accessors: readonly { bufferView: number; byteOffset?: number;
    componentType: number; type: string; count: number;
    normalized?: boolean }[];
  readonly bufferViews: readonly { byteOffset?: number; byteLength: number;
    byteStride?: number }[];
  readonly meshes: readonly { primitives: readonly { attributes:
    Record<string, number>; indices: number; material: number }[] }[];
  readonly materials: readonly { pbrMetallicRoughness?: {
    baseColorFactor?: number[]; roughnessFactor?: number;
    metallicFactor?: number } }[];
  readonly nodes: readonly { scale?: number[]; translation?: number[] }[];
}

const ARRAYS = { 5122: Int16Array, 5123: Uint16Array, 5126: Float32Array };
const SIZES: Readonly<Record<string, number>> = { SCALAR: 1, VEC2: 2, VEC3: 3 };

/** Accessor `i` of `json` over the BIN chunk `bin`. */
function accessor(json: Json, bin: DataView, i: number): GlbAccessor {
  const a = json.accessors[i];
  const view = a ? json.bufferViews[a.bufferView] : undefined;
  const Kind = a ? ARRAYS[a.componentType as keyof typeof ARRAYS] : undefined;
  if (!a || !view || !Kind) throw new Error(`glb: accessor ${i} unsupported`);
  const size = Kind.BYTES_PER_ELEMENT;
  const start = bin.byteOffset + (view.byteOffset ?? 0);
  const all = new Kind(bin.buffer as ArrayBuffer, start,
    Math.floor(view.byteLength / size));
  const itemSize = SIZES[a.type] ?? 1;
  const stride = (view.byteStride ?? 0) / size || itemSize;
  const offset = (a.byteOffset ?? 0) / size;
  const array = new Kind(a.count * itemSize);
  for (let i = 0; i < a.count; i++) {
    array.set(all.subarray(offset + i * stride,
      offset + i * stride + itemSize), i * itemSize);
  }
  return { array, itemSize, normalized: a.normalized ?? false };
}

/** The primitives of `json`'s first mesh. */
function primitives(json: Json, bin: DataView): GlbPrimitive[] {
  return (json.meshes[0]?.primitives ?? []).map((p) => {
    const pbr = json.materials[p.material]?.pbrMetallicRoughness ?? {};
    const [r = 1, g = 1, b = 1] = pbr.baseColorFactor ?? [];
    return {
      index: accessor(json, bin, p.indices),
      position: accessor(json, bin, p.attributes['POSITION'] ?? -1),
      normal: accessor(json, bin, p.attributes['NORMAL'] ?? -1),
      uv: accessor(json, bin, p.attributes['TEXCOORD_0'] ?? -1),
      color: [r, g, b],
      roughness: pbr.roughnessFactor ?? 1,
      metalness: pbr.metallicFactor ?? 1,
    };
  });
}

/** The model in `bytes`, a binary glTF; throws when it is not one. */
export function readGlb(bytes: ArrayBuffer): GlbModel {
  const data = new DataView(bytes);
  if (data.getUint32(0, true) !== MAGIC) throw new Error('glb: not a glb');
  const jsonLength = data.getUint32(HEADER, true);
  if (data.getUint32(HEADER + 4, true) !== JSON_CHUNK) {
    throw new Error('glb: no JSON chunk');
  }
  const text = new TextDecoder().decode(
    new Uint8Array(bytes, HEADER + 8, jsonLength));
  const json = JSON.parse(text) as Json;
  const binAt = HEADER + 8 + jsonLength;
  const bin = new DataView(bytes, binAt + 8, data.getUint32(binAt, true));
  const node = json.nodes[0] ?? {};
  const [tx = 0, ty = 0, tz = 0] = node.translation ?? [];
  return { primitives: primitives(json, bin), scale: node.scale?.[0] ?? 1,
    translation: [tx, ty, tz] };
}
