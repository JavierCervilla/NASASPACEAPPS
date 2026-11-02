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
 * The camera at the view's look (VENT-34, view-camera.ts), the astronaut
 * shown in third person facing the look, and, for the tests and the
 * evidence, where the Sun's and the Earth's centres fall on the host
 * (`data-sun-at`, `data-earth-at`: «x,y» px, empty off screen).
 */
import { Vector3 } from 'three';
import { cameraPose, type CameraMode, type Look } from '../view-camera';
import type { World } from './world';

const RAD = Math.PI / 180;

/** Aims the camera and turns the astronaut. */
export function aimCamera(world: World, mode: CameraMode, look: Look): void {
  const groundY = world.ground(0, 0);
  const pose = cameraPose(mode, look, groundY, world.ground);
  const { camera } = world.stage;
  camera.position.set(...pose.position);
  camera.lookAt(new Vector3(...pose.target));
  camera.updateMatrixWorld();
  const { astronaut } = world;
  astronaut.visible = mode === 'third';
  astronaut.position.set(0, groundY, 0);
  astronaut.rotation.y = -look.yawDeg * RAD;
}

/** «x,y» of `point` on the host, or empty when off screen. */
function onHost(world: World, point: Vector3, host: HTMLElement): string {
  const q = point.clone().project(world.stage.camera);
  if (q.z > 1 || Math.abs(q.x) > 1 || Math.abs(q.y) > 1) return '';
  const x = ((q.x + 1) / 2) * host.clientWidth;
  const y = ((1 - q.y) / 2) * host.clientHeight;
  return `${Math.round(x)},${Math.round(y)}`;
}

/** Writes where the Sun and the Earth fall on the host. */
export function markBodies(world: World, host: HTMLElement): void {
  host.dataset['sunAt'] = onHost(world, world.sky.sun.position, host);
  host.dataset['earthAt'] = onHost(world, world.sky.earth.position, host);
}
