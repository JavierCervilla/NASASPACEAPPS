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

import { describe, expect, it } from 'vitest';
import { shadowMapUnsafe } from '../src/terrain/shadow-safety';

describe('shadow safety', () => {
  it('drops the shadow map on the Pixel 10 PowerVR and older PowerVR, on a phone or not', () => {
    for (const phone of [true, false]) {
      expect(shadowMapUnsafe('ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)', phone)).toBe(true);
      expect(shadowMapUnsafe('PowerVR Rogue GE8320', phone)).toBe(true);
    }
  });

  it('keeps it on other named GPUs', () => {
    expect(shadowMapUnsafe('Adreno (TM) 740', true)).toBe(false);
    expect(shadowMapUnsafe('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))', false)).toBe(false);
  });

  // VENT-84: Brave hides WEBGL_debug_renderer_info, so a Pixel 10 was not known as a PowerVR and lost its context.
  it('drops it on a phone whose GPU the browser hides', () => {
    expect(shadowMapUnsafe(null, true)).toBe(true);
  });

  it('keeps it on a desktop whose GPU the browser hides', () => {
    expect(shadowMapUnsafe(null, false)).toBe(false);
  });

  // VENT-92: Brave answers WEBGL_debug_renderer_info with «Brave»; the Pixel 10 lost its context at tier low.
  it('drops it on a phone whose browser names no real GPU', () => {
    for (const name of ['Brave', 'WebKit WebGL', 'Mozilla', 'Generic Renderer']) {
      expect(shadowMapUnsafe(name, true)).toBe(true);
    }
  });

  it('keeps it on a desktop whose browser names no real GPU', () => {
    expect(shadowMapUnsafe('Brave', false)).toBe(false);
  });

  it('keeps it on the phone GPUs it knows that are not PowerVR', () => {
    for (const name of ['Mali-G715', 'Immortalis-G720', 'Samsung Xclipse 940', 'Apple GPU',
      'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)', 'Maleoon 910',
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)']) {
      expect(shadowMapUnsafe(name, true)).toBe(false);
    }
  });
});
