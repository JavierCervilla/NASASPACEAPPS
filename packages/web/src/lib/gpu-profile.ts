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
 * What the GPU can do, read once from the page's single WebGL2 probe
 * (globe/device-probe.ts, VENT-101): its compressed texture families, its
 * largest texture, its anisotropy and a few extensions later work depends on.
 * Capability is not safety: what is safe on a device is still decided by its
 * verdicts (the bench, the on-foot crash marks, terrain/shadow-safety.ts).
 */

/** The compressed texture families the GPU samples. */
export interface TextureFormats {
  readonly astc: boolean;
  readonly etc2: boolean;
  readonly etc1: boolean;
  readonly s3tc: boolean;
  /** S3TC in sRGB: BC1 for a colour map needs it. */
  readonly s3tcSrgb: boolean;
  readonly bptc: boolean;
  readonly rgtc: boolean;
  readonly pvrtc: boolean;
}

export interface GpuProfile {
  readonly textureFormats: TextureFormats;
  readonly maxTextureSize: number;
  /** 1 without EXT_texture_filter_anisotropic. */
  readonly maxAnisotropy: number;
  /** EXT_clip_control: a reversed depth buffer is possible. */
  readonly clipControl: boolean;
  /** KHR_parallel_shader_compile: VENT-93's compile gate can act. */
  readonly parallelShaderCompile: boolean;
  readonly colorBufferFloat: boolean;
  readonly colorBufferHalfFloat: boolean;
  readonly floatBlend: boolean;
  readonly textureFloatLinear: boolean;
}

/** The part of a WebGL2 context the profile reads. */
export interface ProfileSource {
  readonly MAX_TEXTURE_SIZE: number;
  getSupportedExtensions(): string[] | null;
  getExtension(
    name: 'EXT_texture_filter_anisotropic',
  ): { readonly MAX_TEXTURE_MAX_ANISOTROPY_EXT: number } | null;
  getParameter(name: number): unknown;
}

/** Each family's extensions; any one of them is enough. */
const FORMAT_EXTENSIONS: Record<keyof TextureFormats, readonly string[]> = {
  astc: ['WEBGL_compressed_texture_astc'],
  etc2: ['WEBGL_compressed_texture_etc'],
  etc1: ['WEBGL_compressed_texture_etc1'],
  s3tc: ['WEBGL_compressed_texture_s3tc'],
  s3tcSrgb: ['WEBGL_compressed_texture_s3tc_srgb'],
  bptc: ['EXT_texture_compression_bptc'],
  rgtc: ['EXT_texture_compression_rgtc'],
  pvrtc: [
    'WEBGL_compressed_texture_pvrtc',
    'WEBKIT_WEBGL_compressed_texture_pvrtc',
  ],
};

/** The profile's flags, each one extension. */
const FLAG_EXTENSIONS = {
  clipControl: 'EXT_clip_control',
  parallelShaderCompile: 'KHR_parallel_shader_compile',
  colorBufferFloat: 'EXT_color_buffer_float',
  colorBufferHalfFloat: 'EXT_color_buffer_half_float',
  floatBlend: 'EXT_float_blend',
  textureFloatLinear: 'OES_texture_float_linear',
} as const;

type Flag = keyof typeof FLAG_EXTENSIONS;

function formatsOf(listed: ReadonlySet<string>): TextureFormats {
  const entries = Object.entries(FORMAT_EXTENSIONS).map(
    ([family, names]) => [family, names.some((name) => listed.has(name))]);
  return Object.fromEntries(entries) as unknown as TextureFormats;
}

function flagsOf(listed: ReadonlySet<string>): Record<Flag, boolean> {
  const entries = Object.entries(FLAG_EXTENSIONS).map(
    ([flag, name]) => [flag, listed.has(name)]);
  return Object.fromEntries(entries) as Record<Flag, boolean>;
}

/** What a page without a WebGL2 context offers: nothing. */
export const EMPTY_PROFILE: GpuProfile = {
  textureFormats: formatsOf(new Set()),
  maxTextureSize: 0,
  maxAnisotropy: 0,
  ...flagsOf(new Set()),
};

/**
 * The profile of `gl`, from its extension list (which enables nothing) and
 * two parameters; only the anisotropy's extension is asked for, to read its
 * maximum. Costs about a millisecond (measured in VENT-101).
 */
export function readGpuProfile(gl: ProfileSource | null): GpuProfile {
  if (!gl) return EMPTY_PROFILE;
  const listed = new Set(gl.getSupportedExtensions() ?? []);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  return {
    textureFormats: formatsOf(listed),
    maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
    maxAnisotropy: aniso
      ? Number(gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 1
      : 1,
    ...flagsOf(listed),
  };
}
