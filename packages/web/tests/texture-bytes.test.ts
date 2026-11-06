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
 * The GPU bytes the readout and the bench count for the Moon's maps: RGBA
 * plus a third for the mipmaps for an image, and for a compressed map
 * (VENT-101) the bytes of the levels it carries, 4 bits per texel for ETC2
 * and BC1.
 */
import { CompressedTexture, RGB_ETC2_Format, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { textureBytes } from '../src/globe/texture-bytes';

/** An ETC2 map's levels down to 4 x 4: 8 bytes per 4 x 4 block. */
function etc2(width: number, height: number): CompressedTexture {
  const mipmaps = [];
  for (let w = width, h = height; w >= 1 && h >= 1; w >>= 1, h >>= 1) {
    const blocks = Math.ceil(w / 4) * Math.ceil(h / 4);
    mipmaps.push({ data: new Uint8Array(blocks * 8), width: w, height: h });
  }
  return new CompressedTexture(mipmaps, width, height, RGB_ETC2_Format);
}

describe('the maps\' GPU bytes', () => {
  it('counts an image as RGBA with its mipmaps', () => {
    const image = new Texture({ width: 2048, height: 1024 });
    expect(textureBytes(image)).toBe(Math.round(2048 * 1024 * 4 * 4 / 3));
  });

  it('counts a compressed map by the levels it carries: the 2K ETC2 is 1.40 MB, not 11.18', () => {
    const bytes = textureBytes(etc2(2048, 1024));
    expect(bytes / 1e6).toBeCloseTo(1.4, 2);
    expect(bytes).toBeLessThan(textureBytes(new Texture({ width: 2048, height: 1024 })) / 7);
  });

  it('adds the maps and counts a missing one as nothing', () => {
    const image = new Texture({ width: 4, height: 4 });
    expect(textureBytes(etc2(8, 8), null, image)).toBe(32 + 8 + 8 + 8 + Math.round(64 * 4 / 3));
  });
});
