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

// The scanned rocks of the on-foot view (VENT-124): NASA Astromaterials 3D's web-resolution models of Apollo 17
// samples (public domain, NASA acknowledged as source; ASSETS.md) cut down to about 1,500 triangles each by
// meshoptimizer's simplifier (pinned devDependency), turned so the shortest axis stands up, centred and scaled to a
// unit radius, and packed with their UVs and normals into one small binary the scene reads without a loader; each
// colour texture becomes a 512 px WebP. Deterministic: the same zips give the same bytes.
//   node packages/web/scripts/scan-rocks.mjs <folder with the downloaded <id>.zip> [--obj-out <folder>]
// The zips are read as data (their own central directory, inflated here); nothing in them is run. Each zip must
// match the sha256 ASSETS.md records for it, and what it inflates to is capped (`MAX_INFLATED_BYTES`), so a swapped
// or hostile download stops the script before it is read. `--obj-out` also writes each result as an OBJ, to look at it.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import sharp from 'sharp';
import { packShapes } from './scan-rocks-pack.mjs';

/** The samples, in the order the binary holds them. */
export const SAMPLES = ['70175-0', '70295-0', '76535-0', '79115-0'];
/** Each sample's downloaded zip, as ASSETS.md records it (downloaded 2026-11-13). */
export const ZIP_SHA256 = {
  '70175-0': '3f7dd0242430ebe36493bcae579c11f00162144354b637e3bed0d334697ee8f8',
  '70295-0': '4f5d9d4cf944b25843b478801e29baa9f7508ee28634c8d50433e9732c70c92c',
  '76535-0': 'ae487719ac8c5ec761f65e0e45ef531b6d29d75b99fabef8da92709bf7756ae4',
  '79115-0': 'b9a45a579a1299422a1d69a66e8df7b1b5c6df35afc8de3da2fd5766b24f9602',
};
/** The most a zip may inflate to, all its files together: the largest of the four is 24.4 MB. */
export const MAX_INFLATED_BYTES = 64 * 1024 * 1024;
const TARGET_TRIANGLES = 1500;
const TEXTURE_PX = 512;
const WEBP = { quality: 72, effort: 6 };
/** The brightest a base-colour texel may be at its 99th percentile, per channel (sRGB): a lab-lit scan is no
 * brighter than the regolith reads (#C9C5BE, the cap the Mooner session's props use). */
const ALBEDO_P99_CAP = [0xc9, 0xc5, 0xbe];
const OUT = new URL('../src/terrain/maps/', import.meta.url).pathname;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * The files of a zip, by name, from its central directory (stored or deflated only); throws once they would add up
 * to more than `maxBytes`, whatever sizes the directory declares (the inflater itself is bounded).
 */
export function unzip(bytes, maxBytes = MAX_INFLATED_BYTES) {
  const eocd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = bytes.readUInt16LE(eocd + 10);
  const files = new Map();
  let left = maxBytes;
  for (let i = 0, at = bytes.readUInt32LE(eocd + 16); i < count; i++) {
    const [method, size, nameLen, extraLen, commentLen] = [bytes.readUInt16LE(at + 10), bytes.readUInt32LE(at + 20),
      bytes.readUInt16LE(at + 28), bytes.readUInt16LE(at + 30), bytes.readUInt16LE(at + 32)];
    const name = bytes.toString('utf8', at + 46, at + 46 + nameLen);
    const local = bytes.readUInt32LE(at + 42);
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const raw = bytes.subarray(start, start + size);
    if (bytes.readUInt32LE(at + 24) > left || raw.length > left) throw new Error(`zip inflates past ${maxBytes} B`);
    let file;
    try {
      file = method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: left });
    } catch (error) {
      throw new Error(`zip inflates past ${maxBytes} B (${error.code ?? error.message})`);
    }
    left -= file.length;
    files.set(name, file);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/** `zip`'s bytes, after checking them against the sha256 recorded for sample `id`. */
export function checkedZip(id, zip) {
  const got = sha256(zip);
  if (got !== ZIP_SHA256[id]) throw new Error(`${id}.zip: sha256 ${got}, expected ${ZIP_SHA256[id]} (ASSETS.md)`);
  return zip;
}

/** An OBJ's triangles as one vertex per distinct position and UV pair. */
export function parseObj(text) {
  const [v, vt, keys, positions, uvs, index] = [[], [], new Map(), [], [], []];
  const vertex = (token) => {
    if (!keys.has(token)) {
      const [p, t] = token.split('/').map((s) => Number(s) - 1);
      keys.set(token, keys.size);
      positions.push(...v[p]);
      uvs.push(...vt[t]);
    }
    return keys.get(token);
  };
  for (const line of text.split('\n')) {
    const w = line.trim().split(/\s+/);
    if (w[0] === 'v') v.push(w.slice(1, 4).map(Number));
    else if (w[0] === 'vt') vt.push(w.slice(1, 3).map(Number));
    else if (w[0] === 'f') index.push(...w.slice(1, 4).map(vertex));
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), index: new Uint32Array(index) };
}

/** `mesh` cut to about TARGET_TRIANGLES, UVs weighed so the texture's charts hold, unused vertices dropped. */
function simplified(mesh) {
  const [index] = MeshoptSimplifier.simplifyWithAttributes(mesh.index, mesh.positions, 3, mesh.uvs, 2, [0.5, 0.5],
    null, TARGET_TRIANGLES * 3, 1, ['Permissive']);
  const [remap, count] = MeshoptSimplifier.compactMesh(index);
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  remap.forEach((to, from) => {
    if (to === 0xffffffff) return;
    positions.set(mesh.positions.subarray(from * 3, from * 3 + 3), to * 3);
    uvs.set(mesh.uvs.subarray(from * 2, from * 2 + 2), to * 2);
  });
  return { positions, uvs, index };
}

/** `jpeg` at TEXTURE_PX (Lanczos, sharp's default), scaled uniformly so its 99th percentile is under the cap. */
async function colourMap(jpeg) {
  const resized = sharp(jpeg).resize(TEXTURE_PX, TEXTURE_PX).removeAlpha();
  const { data } = await resized.clone().raw().toBuffer({ resolveWithObject: true });
  const p99 = [0, 1, 2].map((c) => {
    const values = data.filter((_, i) => i % 3 === c).sort((a, b) => a - b);
    return values[Math.floor(values.length * 0.99)];
  });
  const factor = Math.min(1, ...p99.map((v, c) => ALBEDO_P99_CAP[c] / v));
  const webp = await (factor < 1 ? resized.linear(factor, 0) : resized).webp(WEBP).toBuffer();
  return { webp, p99, factor };
}

/** Writes `mesh` (packShapes' frame) as an OBJ, to look at it. */
function writeObj(path, mesh) {
  const lines = [];
  for (let i = 0; i < mesh.positions.length; i += 3) lines.push(`v ${mesh.positions.slice(i, i + 3).join(' ')}`);
  for (let i = 0; i < mesh.uvs.length; i += 2) lines.push(`vt ${mesh.uvs.slice(i, i + 2).join(' ')}`);
  for (let i = 0; i < mesh.index.length; i += 3) {
    lines.push(`f ${[...mesh.index.slice(i, i + 3)].map((k) => `${k + 1}/${k + 1}`).join(' ')}`);
  }
  writeFileSync(path, `${lines.join('\n')}\n`);
}

async function main([zips, flag, objOut]) {
  await MeshoptSimplifier.ready;
  const meshes = [];
  for (const id of SAMPLES) {
    const zip = checkedZip(id, readFileSync(join(zips, `${id}.zip`)));
    const files = unzip(zip);
    const base = `${id}_SFM_Web-Resolution-Model_Coordinate-Registered`;
    meshes.push(simplified(parseObj(files.get(`${base}.obj`).toString('utf8'))));
    const { webp, p99, factor } = await colourMap(files.get(`${base}.jpg`));
    writeFileSync(join(OUT, `on-foot-rock-${id}.webp`), webp);
    console.log(`${id}: zip ${sha256(zip)}, ${meshes.at(-1).index.length / 3} triangles, texel p99 ${p99}`,
      `scaled by ${factor.toFixed(3)}, on-foot-rock-${id}.webp ${webp.length} B ${sha256(webp)}`);
  }
  const { bytes, shapes } = packShapes(meshes);
  writeFileSync(join(OUT, 'on-foot-rocks.bin'), bytes);
  console.log(`on-foot-rocks.bin ${bytes.length} B ${sha256(bytes)}`);
  if (flag === '--obj-out') {
    mkdirSync(objOut, { recursive: true });
    shapes.forEach((shape, i) => writeObj(join(objOut, `${SAMPLES[i]}.obj`), shape));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
