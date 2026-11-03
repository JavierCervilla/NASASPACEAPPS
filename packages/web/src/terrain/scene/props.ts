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
 * What stands near the point (VENT-34): the illustrative rocks (rocks.ts,
 * stones.ts) as one mesh of rounded stones.
 */
import { BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { scatterRocks } from '../rocks';
import { contactAo, stonesBuffers, type GroundAt } from '../stones';
import { geometryOf } from './mesh-of';
import { maskSun, type SunMask } from './sun-mask';

function masked(color: number, mask: SunMask, roughness = 0.92) {
  const material = new MeshStandardMaterial({ color, roughness,
    metalness: 0 });
  maskSun(material, mask, false);
  return material;
}

/** The scatter of stones of `seed` on `ground`. */
export function rocksMesh(
  seed: number,
  ground: GroundAt,
  mask: SunMask,
): Mesh {
  const rocks = scatterRocks(seed, { count: 420, innerM: 2.5, outerM: 120 });
  const buffers = stonesBuffers(rocks, ground);
  const geometry = geometryOf(buffers);
  geometry.setAttribute('color', new BufferAttribute(
    contactAo(buffers.positions, ground), 3));
  const material = masked(0xb4b1ab, mask);
  material.vertexColors = true;
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
