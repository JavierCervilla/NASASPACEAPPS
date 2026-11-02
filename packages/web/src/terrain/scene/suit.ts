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
 * The astronaut's materials (VENT-34): the suit, white fabric with its
 * texture (the glb does not carry it), and the gold visor; both masked by
 * the Sun's reach at the point (sun-mask.ts).
 */
import {
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import suitUrl from '../../../models/astronaut-suit.webp?url';
import { maskSun, type SunMask } from './sun-mask';

/** The suit's white (its fabric reflects about 0.75 of the light). */
const SUIT_TINT = 0xf4f4f4;
/** The gold-tinted visor, a polished coat. */
const VISOR = { color: 0xc7a24f, roughness: 0.16, metalness: 0.2 } as const;

/** The material of primitive `i`: the textured suit, then the visor. */
export function materialOf(i: number, suit: Texture, mask: SunMask) {
  const material = i === 0
    ? new MeshStandardMaterial({ color: SUIT_TINT, map: suit,
      roughness: 0.82, metalness: 0 })
    : new MeshStandardMaterial(VISOR);
  maskSun(material, mask, false);
  return material;
}

/** The suit's texture, laid out as glTF does (origin at the top). */
export async function loadSuit(): Promise<Texture> {
  const texture = await new TextureLoader().loadAsync(suitUrl);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  return texture;
}

