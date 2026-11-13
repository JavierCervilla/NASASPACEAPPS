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

// The KTX2 maps (VENT-101): which files are encoded, how, and the manifest that records the sha256 of each source
// and output, the encoder and its settings. Pure; scripts/moon-ktx2.mjs encodes and writes, and its `--verify` (CI)
// and tests/ktx2-manifest.test.ts hold the committed files to the manifest.
import { createHash } from 'node:crypto';

/** The pinned encoder (devDependency, exact version): Basis Universal v2.5 in wasm, for every map but the native ones. */
export const ENCODER = 'ktx2-encoder 0.6.0';

/** Where the manifest lives, under packages/web (not served). */
export const MANIFEST = 'src/textures/ktx2.json';

/**
 * The encoder of the maps past the wasm encoder's 12 Mpx cap (VENT-123): the native basisu built from the upstream
 * commit the wasm was built from (ktx2-encoder's THIRD_PARTY_NOTICES.md), with KTX2_SETTINGS as its flags. It
 * re-encodes the 4K to the wasm's bytes. The build and the exact command are in ASSETS.md.
 */
export const NATIVE_ENCODER = 'basisu 2.50.0 native (BinomialLLC/basis_universal 1b33fd5)';

/** Why a native map is checked by its sha256 and never re-encoded here. */
export const NATIVE_NOTE = 'encoded by the native basisu (the wasm encoder refuses sources over 12 Mpx): sha256 checked';

/**
 * Each map and its source, under packages/web: the globe's 2K, 4K and 8K colour (the 1K stays JPEG: start, offline
 * and fallback; the 8K is encoded natively) and the on-foot albedo and Earths. Reliefs stay JPEG/WebP.
 */
export const KTX2_JOBS = [
  { source: 'public/textures/moon-lroc-2k.jpg', output: 'public/textures/moon-lroc-2k.ktx2' },
  { source: 'public/textures/moon-lroc-4k.jpg', output: 'public/textures/moon-lroc-4k.ktx2' },
  { source: 'src/terrain/maps/on-foot-regolith-albedo.webp', output: 'src/terrain/maps/on-foot-regolith-albedo.ktx2' },
  { source: 'src/terrain/maps/on-foot-earth.webp', output: 'src/terrain/maps/on-foot-earth.ktx2' },
  { source: 'src/terrain/maps/on-foot-earth-512.webp', output: 'src/terrain/maps/on-foot-earth-512.ktx2' },
  { source: 'public/textures/moon-lroc-8k.jpg', output: 'public/textures/moon-lroc-8k.ktx2', encoder: NATIVE_ENCODER },
];

/**
 * ETC1S q128 (the measured choice: 42.5 dB and SSIM 0.993 against the JPEG in the render), mipmaps made at encode,
 * sRGB (perceptual, and the sRGB transfer function in the DFD), no supercompression (ETC1S is already compressed).
 * Flipped in Y: a compressed texture is not flipped at upload, as a JPEG is.
 */
export const KTX2_SETTINGS = {
  isUASTC: false,
  isKTX2File: true,
  qualityLevel: 128,
  compressionLevel: 2,
  generateMipmap: true,
  isSetKTX2SRGBTransferFunc: true,
  isPerceptual: true,
  isYFlip: true,
  needSupercompression: false,
};

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The manifest of these sources and outputs, read through `read(path)`. */
export function manifestOf(read) {
  const maps = KTX2_JOBS.map(({ source, output, encoder }) => ({
    source,
    output,
    ...(encoder ? { encoder } : {}),
    sourceSha256: sha256(read(source)),
    outputSha256: sha256(read(output)),
    bytes: read(output).byteLength,
  }));
  return { encoder: ENCODER, settings: KTX2_SETTINGS, maps };
}

/**
 * What differs between `manifest` (as committed) and the files `read(path)` gives: one line per changed map, source,
 * setting set or encoder. Empty when all match.
 */
export function manifestProblems(manifest, read) {
  const now = manifestOf(read);
  const problems = [];
  if (manifest?.encoder !== now.encoder) problems.push(`encoder: ${manifest?.encoder} is not ${now.encoder}`);
  if (JSON.stringify(manifest?.settings) !== JSON.stringify(now.settings)) problems.push('settings differ');
  now.maps.forEach((map, index) => {
    const kept = manifest?.maps?.[index] ?? {};
    for (const key of ['source', 'output', 'encoder', 'sourceSha256', 'outputSha256', 'bytes']) {
      if (kept[key] !== map[key]) problems.push(`${map.output}: ${key} is ${kept[key]}, the file says ${map[key]}`);
    }
  });
  return problems;
}
