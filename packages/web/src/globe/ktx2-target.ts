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
 * Which GPU format the Moon's KTX2 colour maps are transcoded to (VENT-101),
 * from the page probe's profile alone: format support belongs to the browser
 * and the GPU, the same in the probe and in the globe's context (same API,
 * same powerPreference), so the choice is known before three loads and the
 * early 2K can be asked as KTX2. three's `KTX2Loader.detectSupport` needs a
 * renderer and its loader cannot run under the page's CSP, so it is not used.
 */
import type { GpuProfile } from '../lib/gpu-profile';

/**
 * ETC2 RGB or BC1: both 4 bits per texel, both lossless from ETC1S. Never
 * RGBA32: for that, the JPEG is better.
 */
export type Ktx2Target = 'etc2' | 'bc1';

/** Desktop Linux, where Mesa exposes ETC and ASTC it only emulates. */
export type Platform = 'linux-desktop' | 'other';

/** The KTX2 decision and, when off, why. */
export type Ktx2Choice =
  | { readonly target: Ktx2Target }
  | { readonly target: null; readonly reason: string };

/** Desktop Linux exposing every family: ETC2 is likely emulated (three). */
function emulatedEtc(profile: GpuProfile, platform: Platform): boolean {
  const { astc, etc2, bptc, s3tc } = profile.textureFormats;
  return platform === 'linux-desktop' && astc && etc2 && bptc && s3tc;
}

/** ETC2 where sampled for real, else BC1 in sRGB, else null (the JPEG). */
export function ktx2Target(
  profile: GpuProfile,
  platform: Platform,
): Ktx2Target | null {
  const { etc2, s3tc, s3tcSrgb } = profile.textureFormats;
  if (etc2 && !emulatedEtc(profile, platform)) return 'etc2';
  return s3tc && s3tcSrgb ? 'bc1' : null;
}

/** The platform from the browser's own words, as three reads them. */
export function pagePlatform(nav: {
  readonly platform: string;
  readonly userAgent: string;
}): Platform {
  const linux = nav.platform.includes('Linux');
  const android = nav.userAgent.includes('Android');
  return linux && !android ? 'linux-desktop' : 'other';
}

/** Whether the address turns KTX2 off with `?ktx2=0`. */
export const ktx2Off = (search: string): boolean =>
  new URLSearchParams(search).get('ktx2') === '0';

/**
 * The decision for this page: off on `?ktx2=0` (to bisect from a phone's
 * address bar, like `?onfoot=`), else the profile's target.
 */
export function ktx2Choice(
  profile: GpuProfile,
  platform: Platform,
  search: string,
): Ktx2Choice {
  if (ktx2Off(search)) {
    return { target: null, reason: '?ktx2=0' };
  }
  const target = ktx2Target(profile, platform);
  return target ? { target } : { target: null, reason: 'no ETC2 or BC1' };
}
