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
 * The readout's «GPU» block (VENT-101): what the page probe's profile says
 * the GPU offers, and where the Moon's KTX2 colour maps go.
 */
import type { GpuProfile, TextureFormats } from '../lib/gpu-profile';
import type { Ktx2Choice } from '../globe/ktx2-target';

/** Each family's name in the readout, in the order shown. */
const FAMILY_NAMES: Record<keyof TextureFormats, string> = {
  astc: 'ASTC',
  etc2: 'ETC2',
  etc1: 'ETC1',
  s3tc: 'S3TC',
  s3tcSrgb: 'S3TC-sRGB',
  bptc: 'BPTC',
  rgtc: 'RGTC',
  pvrtc: 'PVRTC',
};

/** «tex ASTC ETC2 ETC1 RGTC · max 8192 · aniso 16». */
function textureLine(profile: GpuProfile): string {
  const families = Object.entries(FAMILY_NAMES)
    .filter(([family]) =>
      profile.textureFormats[family as keyof TextureFormats])
    .map(([, name]) => name);
  const named = families.length > 0 ? families.join(' ') : 'none';
  return `tex ${named} · max ${profile.maxTextureSize} · ` +
    `aniso ${profile.maxAnisotropy}`;
}

/** «clip_control · no parallel compile · float cb». */
function featureLine(profile: GpuProfile): string {
  const word = (on: boolean, name: string) => (on ? name : `no ${name}`);
  return [
    word(profile.clipControl, 'clip_control'),
    word(profile.parallelShaderCompile, 'parallel compile'),
    word(profile.colorBufferFloat, 'float cb'),
  ].join(' · ');
}

/** The block's three lines: formats, features, and the KTX2 decision. */
export function gpuLines(profile: GpuProfile, ktx2: Ktx2Choice): string[] {
  const decision = ktx2.target
    ? `ktx2 → ${ktx2.target.toUpperCase()}`
    : `ktx2 off: ${ktx2.reason}`;
  return [textureLine(profile), featureLine(profile), decision];
}
