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

import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { inFront } from '../src/terrain/scene/in-front';

/** A camera 2 m up looking north (-z), its depth reversed as three does on the first render with reversedDepthBuffer. */
function reversedCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(60, 1, 0.2, 1_200_000);
  camera.position.set(0, 2, 0);
  camera.lookAt(0, 2, -10);
  camera.updateMatrixWorld();
  (camera as unknown as { _reversedDepth: boolean })._reversedDepth = true;
  camera.updateProjectionMatrix();
  return camera;
}

describe('in front of the camera (VENT-103)', () => {
  it('tells a point behind a reversed-depth camera, which the projected z no longer does', () => {
    const camera = reversedCamera();
    const behind = new Vector3(0, 2, 10);
    expect(behind.clone().project(camera).z).toBeLessThan(1);
    expect(inFront(camera, behind)).toBe(false);
  });

  it('keeps a point ahead in front, at any distance the view draws', () => {
    const camera = reversedCamera();
    for (const z of [-1, -500, -190_000, -900_000]) expect(inFront(camera, new Vector3(0, 0, z))).toBe(true);
  });
});
