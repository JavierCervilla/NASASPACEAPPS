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

// Encodes the KTX2 maps (VENT-101) from their committed JPEG and WebP sources with the pinned ktx2-encoder (Basis
// Universal v2.5, wasm) and sharp, and writes the manifest (scripts/ktx2-manifest.mjs).
//   node packages/web/scripts/moon-ktx2.mjs           encode, write the maps and the manifest
//   node packages/web/scripts/moon-ktx2.mjs --verify  the committed maps and sources match the manifest (CI, cheap)
//   node packages/web/scripts/moon-ktx2.mjs --check   re-encode in memory and compare with the committed maps (~75 s)
// The encoding is deterministic: two runs give the same bytes. The 8K colour (VENT-123) is past the wasm encoder's
// 12 Mpx cap: it is encoded by the native basisu (ASSETS.md has the command), and here only its sha256 is checked.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';
import {
  KTX2_JOBS,
  KTX2_SETTINGS,
  MANIFEST,
  NATIVE_NOTE,
  manifestOf,
  manifestProblems,
  sha256,
} from './ktx2-manifest.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(`${ROOT}${path}`);

/** RGBA pixels of an image file, as the encoder takes them. */
async function decode(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

const encode = (source) => encodeToKTX2(read(source), { ...KTX2_SETTINGS, imageDecoder: decode });

/** Encodes every map; writes them and the manifest, or compares them with the committed ones. */
async function run(write) {
  const problems = [];
  for (const { source, output, encoder } of KTX2_JOBS) {
    if (encoder) {
      console.log(`${output}: ${NATIVE_NOTE}`);
      continue;
    }
    const bytes = await encode(source);
    if (write) writeFileSync(`${ROOT}${output}`, bytes);
    else if (sha256(bytes) !== sha256(read(output))) problems.push(`${output}: re-encoded bytes differ`);
    console.log(`${output}: ${bytes.byteLength} bytes`);
  }
  if (write) writeFileSync(`${ROOT}${MANIFEST}`, `${JSON.stringify(manifestOf(read), null, 2)}\n`);
  return problems;
}

/** What the manifest says differs for the natively encoded maps, which no mode here re-encodes. */
function nativeProblems() {
  const outputs = KTX2_JOBS.filter((job) => job.encoder).map((job) => `${job.output}:`);
  const all = manifestProblems(JSON.parse(read(MANIFEST)), read);
  return all.filter((line) => outputs.some((output) => line.startsWith(output)));
}

const mode = process.argv[2];
const problems = mode === '--verify' ? manifestProblems(JSON.parse(read(MANIFEST)), read)
  : [...(mode ? nativeProblems() : []), ...(await run(!mode))];
if (mode === '--verify') {
  for (const { output, encoder } of KTX2_JOBS) if (encoder) console.log(`${output}: ${NATIVE_NOTE}`);
}
for (const problem of problems) console.error(`moon-ktx2: ${problem}`);
if (problems.length > 0) process.exit(1);
console.log(`moon-ktx2: ${mode ?? 'written'}: ok`);
