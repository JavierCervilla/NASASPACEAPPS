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
 * The GPU capability profile (VENT-101 step 1): read once from the page's
 * single WebGL2 probe, from the extension list (which enables nothing) and a
 * few parameters, so `?debug` and the KTX2 target know what the GPU offers.
 */
import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROFILE,
  readGpuProfile,
  type ProfileSource,
} from '../src/lib/gpu-profile';

/** The Pixel 10's WebGL2 extensions (VENT-80 pixel10-webgl-report.md). */
const PIXEL_10 = [
  'EXT_clip_control',
  'EXT_color_buffer_float',
  'EXT_color_buffer_half_float',
  'EXT_conservative_depth',
  'EXT_float_blend',
  'EXT_polygon_offset_clamp',
  'EXT_texture_compression_rgtc',
  'EXT_texture_filter_anisotropic',
  'EXT_texture_norm16',
  'OES_draw_buffers_indexed',
  'WEBGL_compressed_texture_astc',
  'WEBGL_compressed_texture_etc',
  'WEBGL_compressed_texture_etc1',
  'WEBGL_debug_renderer_info',
  'WEBGL_lose_context',
  'WEBGL_multi_draw',
];

const MAX_TEXTURE_SIZE = 0x0d33;
const MAX_ANISOTROPY = 0x84ff;

/** A context that answers `extensions` and these parameters. */
function fakeContext(
  extensions: readonly string[],
  maxTexture = 8192,
  maxAnisotropy = 16,
): ProfileSource & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    MAX_TEXTURE_SIZE,
    getSupportedExtensions: () => [...extensions],
    getExtension: (name) => {
      asked.push(name);
      if (!extensions.includes(name)) return null;
      return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: MAX_ANISOTROPY };
    },
    getParameter: (name) =>
      name === MAX_TEXTURE_SIZE ? maxTexture
        : name === MAX_ANISOTROPY ? maxAnisotropy : null,
  };
}

describe('the GPU profile', () => {
  it('reads the Pixel 10: ASTC, ETC2, ETC1 and RGTC, clip control, no parallel compile', () => {
    const profile = readGpuProfile(fakeContext(PIXEL_10));
    expect(profile.textureFormats).toEqual({
      astc: true, etc2: true, etc1: true, s3tc: false, s3tcSrgb: false,
      bptc: false, rgtc: true, pvrtc: false,
    });
    expect(profile.maxTextureSize).toBe(8192);
    expect(profile.maxAnisotropy).toBe(16);
    expect(profile.clipControl).toBe(true);
    expect(profile.parallelShaderCompile).toBe(false);
    expect(profile.colorBufferFloat).toBe(true);
    expect(profile.colorBufferHalfFloat).toBe(true);
    expect(profile.floatBlend).toBe(true);
    expect(profile.textureFloatLinear).toBe(false);
  });

  it('reads a desktop with S3TC, its sRGB variant, BPTC and parallel compile', () => {
    const profile = readGpuProfile(fakeContext([
      'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
      'EXT_texture_compression_bptc', 'KHR_parallel_shader_compile',
      'OES_texture_float_linear', 'WEBKIT_WEBGL_compressed_texture_pvrtc',
    ], 16384));
    expect(profile.textureFormats).toMatchObject({
      s3tc: true, s3tcSrgb: true, bptc: true, pvrtc: true, etc2: false,
    });
    expect(profile.parallelShaderCompile).toBe(true);
    expect(profile.textureFloatLinear).toBe(true);
    expect(profile.maxTextureSize).toBe(16384);
  });

  it('is empty without a context', () => {
    expect(readGpuProfile(null)).toEqual(EMPTY_PROFILE);
    expect(Object.values(EMPTY_PROFILE.textureFormats)).not.toContain(true);
    expect(EMPTY_PROFILE.maxTextureSize).toBe(0);
  });

  it('takes an anisotropy of 1 without its extension, and enables nothing else', () => {
    const gl = fakeContext(['WEBGL_compressed_texture_etc']);
    expect(readGpuProfile(gl).maxAnisotropy).toBe(1);
    expect(gl.asked).toEqual(['EXT_texture_filter_anisotropic']);
  });

  it('survives a context that lists no extensions', () => {
    const gl = { ...fakeContext([]), getSupportedExtensions: () => null };
    expect(readGpuProfile(gl).textureFormats.etc2).toBe(false);
  });
});
