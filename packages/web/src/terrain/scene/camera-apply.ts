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
 * The camera at the view's look (VENT-34, view-camera.ts), and, for the
 * tests and the evidence, where the Sun's and the Earth's centres fall on
 * the host (`data-sun-at`, `data-earth-at`: «x,y» px, empty off screen).
 */
import { Vector3 } from 'three';
import { cameraPose, type Look } from '../view-camera';
import { inFront } from './in-front';
import type { World } from './world';

/** Aims the camera from the eye, `at` metres east and north of the point. */
export function aimCamera(
  world: World,
  look: Look,
  at: readonly [number, number] = [0, 0],
): void {
  const pose = cameraPose(look, world.ground(at[0], at[1]), at);
  const { camera } = world.stage;
  camera.position.set(...pose.position);
  camera.lookAt(new Vector3(...pose.target));
  camera.updateMatrixWorld();
}

/** «x,y» of `point` on the host, or empty when off screen. */
function onHost(world: World, point: Vector3, host: HTMLElement): string {
  const q = point.clone().project(world.stage.camera);
  const off = Math.abs(q.x) > 1 || Math.abs(q.y) > 1;
  if (off || !inFront(world.stage.camera, point)) return '';
  const x = ((q.x + 1) / 2) * host.clientWidth;
  const y = ((1 - q.y) / 2) * host.clientHeight;
  return `${Math.round(x)},${Math.round(y)}`;
}

/** Writes where the Sun and the Earth fall on the host. */
export function markBodies(world: World, host: HTMLElement): void {
  // The sky follows the eye (VENT-121): the bodies' places in the world.
  const { sun, earth } = world.sky;
  host.dataset['sunAt'] = onHost(world, sun.getWorldPosition(new Vector3()),
    host);
  host.dataset['earthAt'] = onHost(world,
    earth.getWorldPosition(new Vector3()), host);
}
