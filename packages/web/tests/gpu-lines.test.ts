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
 * The «GPU» block of the `?debug` readout (VENT-101 step 1): the compressed
 * texture families, the largest texture and the anisotropy, the extensions
 * later work reads, and where the Moon's KTX2 maps go, so a phone needs no
 * webglreport.com.
 */
import { describe, expect, it } from 'vitest';
import { gpuLines } from '../src/devtools/gpu-lines';
import { EMPTY_PROFILE, type GpuProfile } from '../src/lib/gpu-profile';
import { readout } from '../src/devtools/readout';

const PIXEL: GpuProfile = {
  ...EMPTY_PROFILE,
  textureFormats: {
    ...EMPTY_PROFILE.textureFormats,
    astc: true, etc2: true, etc1: true, rgtc: true,
  },
  maxTextureSize: 8192,
  maxAnisotropy: 16,
  clipControl: true,
  colorBufferFloat: true,
};

describe('the GPU lines', () => {
  it('read the Pixel 10 as the plan shows it', () => {
    expect(gpuLines(PIXEL, { target: 'etc2' })).toEqual([
      'tex ASTC ETC2 ETC1 RGTC · max 8192 · aniso 16',
      'clip_control · no parallel compile · float cb',
      'ktx2 → ETC2',
    ]);
  });

  it('say why KTX2 is off', () => {
    const lines = gpuLines(EMPTY_PROFILE, {
      target: null, reason: 'no ETC2 or BC1',
    });
    expect(lines).toEqual([
      'tex none · max 0 · aniso 0',
      'no clip_control · no parallel compile · no float cb',
      'ktx2 off: no ETC2 or BC1',
    ]);
  });

  it('name BC1 and the S3TC families on a desktop', () => {
    const desktop: GpuProfile = {
      ...EMPTY_PROFILE,
      textureFormats: {
        ...EMPTY_PROFILE.textureFormats,
        s3tc: true, s3tcSrgb: true, bptc: true,
      },
      parallelShaderCompile: true,
    };
    const [tex, features, ktx2] = gpuLines(desktop, { target: 'bc1' });
    expect(tex).toMatch(/^tex S3TC S3TC-sRGB BPTC · /);
    expect(features).toContain(' · parallel compile · ');
    expect(ktx2).toBe('ktx2 → BC1');
  });

  it('follow the GPU name in the readout', () => {
    const text = readout({ fps: 60, frameMs: 16.7, worstMs: 17 }, null, {
      tierLabel: 'Medium',
      gpu: 'PowerVR D-Series DXT-48-1536',
      gpuLines: gpuLines(PIXEL, { target: 'etc2' }),
    });
    expect(text.split('\n').slice(-4)).toEqual([
      'PowerVR D-Series DXT-48-1536',
      'tex ASTC ETC2 ETC1 RGTC · max 8192 · aniso 16',
      'clip_control · no parallel compile · float cb',
      'ktx2 → ETC2',
    ]);
  });
});
