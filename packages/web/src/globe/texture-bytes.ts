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
 * What the Moon's maps hold on the GPU, for the performance readout: RGBA
 * texels plus a third for the mipmap chain, or for a compressed map
 * (VENT-101) the bytes of the levels it carries.
 */
import type { Texture } from 'three';

/** A compressed map's levels, when `texture` is one. */
const levelsOf = (texture: Texture): { data: ArrayBufferView }[] | null =>
  (texture as { isCompressedTexture?: boolean }).isCompressedTexture
    ? (texture.mipmaps as { data: ArrayBufferView }[])
    : null;

/** Estimated GPU bytes of `textures`; a missing one counts 0. */
export function textureBytes(...textures: (Texture | null)[]): number {
  return textures.reduce((sum, texture) => {
    const levels = texture ? levelsOf(texture) : null;
    if (levels) return sum + levels.reduce((n, l) => n + l.data.byteLength, 0);
    const image = texture?.image as { width?: number; height?: number } | null;
    const pixels = (image?.width ?? 0) * (image?.height ?? 0);
    return sum + Math.round(pixels * 4 * (4 / 3));
  }, 0);
}
