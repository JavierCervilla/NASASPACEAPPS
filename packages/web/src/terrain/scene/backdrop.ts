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
 * The far horizon in the scene (VENT-34, far-horizon.ts): a dark wall
 * beyond the tile whose top follows the point's horizon profile, unlit, so
 * it reads as distant terrain and the Sun and the Earth set behind
 * exactly the ridge the card names.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { HorizonProfile } from '@ventana/sim';
import { backdropWall } from '../far-horizon';

const BINS = 720;

/** The wall around an eye at `eyeY`, from `profile` (null: smooth). */
export function backdropMesh(
  profile: HorizonProfile | null,
  eyeY: number,
  radiusM: number,
): Mesh {
  const { positions, index } = backdropWall(profile, eyeY, BINS, radiusM);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  const material = new MeshBasicMaterial({
    color: 0x1b1b1e,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'far-horizon';
  return mesh;
}
