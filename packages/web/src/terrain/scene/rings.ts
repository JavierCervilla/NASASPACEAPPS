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
 * The distance rings in the scene (VENT-34, ring-ribbon.ts): faint white
 * ribbons on the ground at 25, 100 and 500 m, never a signal colour.
 */
import { Mesh, MeshBasicMaterial } from 'three';
import { merge } from '../shapes';
import { ringRibbon } from '../ring-ribbon';
import type { GroundAt } from '../stones';
import { geometryOf } from './mesh-of';
import { RING_DISTANCES_M } from './scene-types';

/** The rings over `ground`. */
export function ringsMesh(ground: GroundAt): Mesh {
  const buffers = merge(RING_DISTANCES_M.map((r) => ringRibbon(r, ground)));
  const material = new MeshBasicMaterial({ color: 0xffffff,
    transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  return new Mesh(geometryOf(buffers), material);
}
