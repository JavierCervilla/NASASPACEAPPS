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
 * The ground under a point of the view (VENT-121): the camera's ray
 * through it, marched over the loaded relief (walk/ground-pick.ts).
 */
import { Vector3 } from 'three';
import type { Vec3 } from '../view-camera';
import { pickGround, type Ray } from '../walk/ground-pick';
import type { EastNorth } from '../walk/walk-reach';
import { reliefHeight } from './walk-sight';
import type { World } from './world';

/** How far a pick looks, metres: well past the reach, into the rings. */
export const PICK_M = 20_000;

/** The camera's ray through the client point `x`, `y`. */
function rayAt(world: World, x: number, y: number): Ray {
  const { camera, renderer } = world.stage;
  const box = renderer.domElement.getBoundingClientRect();
  const ndc = new Vector3(((x - box.left) / box.width) * 2 - 1,
    1 - ((y - box.top) / box.height) * 2, 0.5);
  const dir = ndc.unproject(camera).sub(camera.position).normalize();
  return { origin: camera.position.toArray() as Vec3,
    dir: dir.toArray() as Vec3 };
}

/** The ground under the client point `x`, `y`; null: the sky. */
export function groundAt(world: World, x: number, y: number): EastNorth | null {
  const { input } = world;
  if (!input) return null;
  return pickGround(rayAt(world, x, y), reliefHeight(world, input), PICK_M);
}
