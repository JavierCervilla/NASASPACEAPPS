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
 * The KTX2 maps' manifest (VENT-101): every committed `.ktx2` names its source,
 * the sha256 of both, the encoder and its settings, so CI can tell cheaply that
 * no map or source changed without the other (scripts/moon-ktx2.mjs --verify;
 * --check re-encodes, locally).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ENCODER,
  KTX2_JOBS,
  KTX2_SETTINGS,
  manifestProblems,
} from '../scripts/ktx2-manifest.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (path: string) => readFileSync(`${ROOT}${path}`);
const manifest = JSON.parse(
  readFileSync(`${ROOT}src/textures/ktx2.json`, 'utf8'),
) as unknown;

describe('the KTX2 manifest', () => {
  it('matches every committed map and its source', () => {
    expect(manifestProblems(manifest, read)).toEqual([]);
  });

  it('covers the 2K and 4K colour maps and the on-foot albedo and Earths', () => {
    expect(KTX2_JOBS.map((job) => job.output)).toEqual([
      'public/textures/moon-lroc-2k.ktx2',
      'public/textures/moon-lroc-4k.ktx2',
      'src/terrain/maps/on-foot-regolith-albedo.ktx2',
      'src/terrain/maps/on-foot-earth.ktx2',
      'src/terrain/maps/on-foot-earth-512.ktx2',
    ]);
  });

  it('encodes ETC1S q128 in sRGB with mipmaps, flipped for an upload that is not', () => {
    expect(KTX2_SETTINGS).toMatchObject({
      isUASTC: false, qualityLevel: 128, compressionLevel: 2,
      generateMipmap: true, isSetKTX2SRGBTransferFunc: true,
      isPerceptual: true, isYFlip: true,
    });
    expect(ENCODER).toBe('ktx2-encoder 0.6.0');
  });

  it('starts every map with the KTX2 magic', () => {
    for (const { output } of KTX2_JOBS) {
      expect(read(output).subarray(1, 7).toString('latin1')).toBe('KTX 20');
    }
  });

  it('names a changed map, and a changed setting', () => {
    const tampered = (path: string) =>
      path.endsWith('moon-lroc-4k.ktx2') ? Buffer.from('x') : read(path);
    const problems = manifestProblems(manifest, tampered);
    expect(problems).toEqual([
      expect.stringMatching(/^public\/textures\/moon-lroc-4k\.ktx2: outputSha256 /),
      expect.stringMatching(/^public\/textures\/moon-lroc-4k\.ktx2: bytes /),
    ]);
    const other = structuredClone(manifest) as { settings: object };
    other.settings = { ...other.settings, qualityLevel: 255 };
    expect(manifestProblems(other, read)).toEqual([
      expect.stringContaining('settings'),
    ]);
  });

  it('records the sha256 of each map', () => {
    const { maps } = manifest as { maps: { output: string; outputSha256: string }[] };
    for (const map of maps) {
      const sha = createHash('sha256').update(read(map.output)).digest('hex');
      expect(map.outputSha256).toBe(sha);
    }
  });
});
