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

// Builds the astronaut the page lets you drag onto the Moon (VENT-10) from NASA's «Astronaut» model, NASA 3D
// Resources (public domain), into packages/web/models/astronaut.glb and its suit texture beside it,
// astronaut-suit.webp. They are the input of the offline sprite bake (astronaut-figures.mjs), not files the site serves:
//
//   node packages/web/scripts/astronaut.mjs <Astronaut.glb> [out.glb]
//
// The source is read as data only (a GLB, Draco-compressed). The build bakes the root transform into the mesh, lowers
// the arms (astronaut-mesh.mjs), covers the NASA insignia on the backpack and the mission patch on the suit with the
// fabric next to each, names the two materials `suit` and `visor` (the bake tints the visor with each state's colour,
// so its texture goes), welds the vertices and quantizes the mesh (KHR_mesh_quantization). The output needs no decoder,
// and the suit texture, shrunk to 512 px WebP, is its own file: the page used to load the model under its CSP, which
// allows neither WebAssembly (Draco, meshopt) nor the blob: URL a texture inside a GLB loads through.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, prune, quantize, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { COVERED_MARKS, lowerArms } from './astronaut-mesh.mjs';

const OUT = fileURLToPath(new URL('../models/astronaut.glb', import.meta.url));
const TEXTURE_PX = 512;
const WEBP_QUALITY = 82;
/** The source names its visor material `astnt1_2` and the suit `astnt1_1`. */
const SOURCE_VISOR = 'astnt1_2';
/** Neutral silver, as the dock shows it; the page replaces it live. */
const VISOR = { color: [0.62, 0.64, 0.68, 1], metalness: 0.6, roughness: 0.2 };

/** Bakes every mesh node's world transform into its vertices and clears the nodes' transforms. */
function bakeTransforms(doc) {
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) bakePrimitive(prim, matrix);
  }
  for (const node of doc.getRoot().listNodes()) {
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
}

/** Applies a column-major 4x4 `m` to a primitive's positions and its rotation part to its normals. */
function bakePrimitive(prim, m) {
  const position = prim.getAttribute('POSITION');
  const normal = prim.getAttribute('NORMAL');
  const p = position.getArray().slice();
  for (let i = 0; i < p.length; i += 3) {
    const [x, y, z] = [p[i], p[i + 1], p[i + 2]];
    p[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
    p[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    p[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  }
  position.setArray(p);
  if (!normal) return;
  const n = normal.getArray().slice();
  for (let i = 0; i < n.length; i += 3) {
    const [x, y, z] = [n[i], n[i + 1], n[i + 2]];
    n[i] = m[0] * x + m[4] * y + m[8] * z;
    n[i + 1] = m[1] * x + m[5] * y + m[9] * z;
    n[i + 2] = m[2] * x + m[6] * y + m[10] * z;
  }
  normal.setArray(n);
}

/** Lowers the arms of every primitive. */
function lowerAllArms(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const normal = prim.getAttribute('NORMAL');
      const p = position.getArray().slice();
      const n = normal ? normal.getArray().slice() : null;
      lowerArms(p, n);
      position.setArray(p);
      if (normal && n) normal.setArray(n);
    }
  }
}

/** The suit texture without the marks it must not carry (COVERED_MARKS), `TEXTURE_PX` square, as WebP. */
async function cleanSuitTexture(image) {
  const covers = [];
  for (const { area, from } of COVERED_MARKS) {
    const patch = await sharp(image)
      .extract({ left: from.left, top: from.top, width: area.width, height: area.height })
      .png()
      .toBuffer();
    covers.push({ input: patch, left: area.left, top: area.top });
  }
  const covered = await sharp(image).composite(covers).png().toBuffer();
  return sharp(covered).resize(TEXTURE_PX, TEXTURE_PX).webp({ quality: WEBP_QUALITY, effort: 6 }).toBuffer();
}

/**
 * Names the materials `suit` and `visor`, gives the visor a plain silver, and takes the textures out of the model;
 * returns the suit texture, cleaned (the source carries each as WebP with a PNG fallback; the PNG is the lossless one,
 * so it is the source).
 */
async function setMaterials(doc) {
  let suit = null;
  const root = doc.getRoot();
  for (const material of root.listMaterials()) {
    if (material.getName() === SOURCE_VISOR) {
      material.setName('visor').setBaseColorTexture(null).setBaseColorFactor(VISOR.color);
      material.setMetallicFactor(VISOR.metalness).setRoughnessFactor(VISOR.roughness);
      continue;
    }
    material.setName('suit').setMetallicFactor(0).setRoughnessFactor(0.8);
    const texture = material.getBaseColorTexture();
    const png = root.listTextures().find((t) => t.getName() === texture?.getName() && t.getMimeType() === 'image/png');
    if (!texture || !png) throw new Error('the suit texture is missing');
    suit = await cleanSuitTexture(png.getImage());
    material.setBaseColorTexture(null);
  }
  for (const extension of root.listExtensionsUsed()) {
    const name = extension.extensionName;
    if (name === 'KHR_draco_mesh_compression' || name === 'EXT_texture_webp') extension.dispose();
  }
  return suit;
}

/** Writes `bytes` to `path` and prints its size and sha256. */
function writeAndSay(path, bytes) {
  writeFileSync(path, bytes);
  const sha = createHash('sha256').update(bytes).digest('hex');
  console.log(`${path}: ${bytes.byteLength} bytes, sha256 ${sha}`);
}

/** Reads the source, builds the page's model and its suit texture, writes them beside `out` and prints them. */
async function build(source, out) {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
  const doc = await io.readBinary(new Uint8Array(readFileSync(source)));
  bakeTransforms(doc);
  lowerAllArms(doc);
  const suit = await setMaterials(doc);
  // The suit's UVs stay: the page puts the texture back on.
  const keep = prune({ keepAttributes: true });
  await doc.transform(flatten(), dedup(), keep, weld(), quantize({ quantizePosition: 14, quantizeNormal: 10 }));
  writeAndSay(out, await io.writeBinary(doc));
  writeAndSay(out.replace(/\.glb$/, '-suit.webp'), suit);
}

const [source, out = OUT] = process.argv.slice(2);
if (!source) {
  console.error('usage: node packages/web/scripts/astronaut.mjs <Astronaut.glb> [out.glb]');
  process.exit(2);
}
await build(source, out);
