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
  it('drops the shadow map on the Pixel 10 PowerVR and older PowerVR', () => {
    expect(shadowMapUnsafe('ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)')).toBe(true);
    expect(shadowMapUnsafe('PowerVR Rogue GE8320')).toBe(true);
  });

  it('keeps it on other GPUs and when the name is unknown', () => {
    expect(shadowMapUnsafe('Adreno (TM) 740')).toBe(false);
    expect(shadowMapUnsafe('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))')).toBe(false);
    expect(shadowMapUnsafe('')).toBe(false);
  });
});
