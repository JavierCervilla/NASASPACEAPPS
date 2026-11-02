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
 * The lander's materials (VENT-46): one `MeshStandardMaterial` per
 * primitive, wearing the maps its glb names (colour, normal, ambient
 * occlusion, metal and roughness), the earthshine on its metal
 * (earthshine.ts) and the Sun's mask on its direct light.
 */
import { Color, DoubleSide, MeshStandardMaterial, type Texture } from 'three';
import { lightWithEarthshine } from './earthshine';
import type { GlbMap, GlbPrimitive } from '../glb';
import type { Maps } from './lander-maps';
import { maskSun, type SunMask } from './sun-mask';

export interface Look {
  readonly maps: Maps;
  readonly mask: SunMask;
}

const textureOf = (maps: Maps, slot: GlbMap | null): Texture | null =>
  (slot ? maps.get(slot.uri) ?? null : null);

export function materialOf(p: GlbPrimitive, look: Look): MeshStandardMaterial {
  const { map, normal, occlusion, metalRough } = p.maps;
  const material = new MeshStandardMaterial({ color: new Color(...p.color),
    roughness: p.roughness, metalness: p.metalness, side: DoubleSide });
  material.map = textureOf(look.maps, map);
  material.normalMap = textureOf(look.maps, normal);
  material.normalScale.setScalar(normal?.scale ?? 1);
  material.aoMap = textureOf(look.maps, occlusion);
  material.roughnessMap = textureOf(look.maps, metalRough);
  material.metalnessMap = material.roughnessMap;
  maskSun(material, look.mask, false);
  lightWithEarthshine(material);
  return material;
}
