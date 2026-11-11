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
 * A minimal glTF 2.0 binary writer for one indexed triangle mesh: positions,
 * normals, two UV sets and vertex colours as float32, indices as uint32. The
 * hero film's terrain reaches raea as such a file, loaded as a Bevy mesh
 * asset (`terrain.glb#Mesh0/Primitive0`), because a mesh of a million
 * vertices is too big to pass through the composition as numbers.
 */
import { writeFileSync } from 'node:fs';

const FLOAT = 5126;
const UINT = 5125;
const ARRAY_BUFFER = 34962;
const INDEX_BUFFER = 34963;

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }
  return { min, max };
}

function pad4(n) {
  return (n + 3) & ~3;
}

/**
 * Writes `mesh` ({ positions, normals, uv0, uv1, colors: Float32Array;
 * indices: Uint32Array }) to `path` as a .glb. Any attribute may be left out
 * except positions and indices.
 */
export function writeGlb(path, mesh) {
  const parts = [];
  const accessors = [];
  const views = [];
  const attributes = {};
  let offset = 0;
  const count = mesh.positions.length / 3;
  const add = (array, type, componentType, target, extra = {}) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    parts.push(bytes, Buffer.alloc(pad4(bytes.length) - bytes.length));
    offset += pad4(bytes.length);
    const n = componentType === UINT ? array.length : count;
    accessors.push({ bufferView: views.length - 1, componentType, count: n, type, ...extra });
    return accessors.length - 1;
  };
  attributes.POSITION = add(mesh.positions, 'VEC3', FLOAT, ARRAY_BUFFER, bounds(mesh.positions));
  if (mesh.normals) attributes.NORMAL = add(mesh.normals, 'VEC3', FLOAT, ARRAY_BUFFER);
  if (mesh.uv0) attributes.TEXCOORD_0 = add(mesh.uv0, 'VEC2', FLOAT, ARRAY_BUFFER);
  if (mesh.uv1) attributes.TEXCOORD_1 = add(mesh.uv1, 'VEC2', FLOAT, ARRAY_BUFFER);
  if (mesh.colors) attributes.COLOR_0 = add(mesh.colors, 'VEC4', FLOAT, ARRAY_BUFFER);
  const indices = add(mesh.indices, 'SCALAR', UINT, INDEX_BUFFER);
  const gltf = {
    asset: { version: '2.0', generator: 'ventana-lunar hero film' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes, indices, mode: 4 }] }],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: offset }],
  };
  const json = Buffer.from(JSON.stringify(gltf));
  const jsonChunk = Buffer.concat([json, Buffer.alloc(pad4(json.length) - json.length, 0x20)]);
  const bin = Buffer.concat(parts);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);
  const chunk = (data, kind) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.writeUInt32LE(kind, 4);
    return Buffer.concat([h, data]);
  };
  writeFileSync(path, Buffer.concat([header, chunk(jsonChunk, 0x4e4f534a), chunk(bin, 0x004e4942)]));
}
