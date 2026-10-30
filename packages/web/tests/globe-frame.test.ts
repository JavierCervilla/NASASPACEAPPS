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
import { FOV_DEG } from '../src/globe/framing';
import { globeFrame } from '../src/globe/sheet-edge';
import { frameCamera, type StageFrame } from '../src/globe/stage';
import { detentsFor } from '../src/sheet/sheet-physics';

// The e2e phone: 390x844, with the Moon framed above the 290 px the sheet at half covers (phone.css).
const PHONE = { width: 390, height: 844, inset: 290, screen: 844 };
const DETENTS = detentsFor(PHONE.screen);

/** Where `point` lands on a canvas framed by `frame`, in CSS px from its top left. */
function screenPx(frame: StageFrame, point: Vector3): { x: number; y: number } {
  const camera = new PerspectiveCamera(FOV_DEG, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  frameCamera(camera, frame);
  const v = point.clone().project(camera);
  return { x: ((v.x + 1) / 2) * frame.width, y: ((1 - v.y) / 2) * frame.height };
}

describe('globe frame beside the phone sheet', () => {
  it('keeps the canvas the whole screen and frames the Moon above the sheet at half', () => {
    expect(globeFrame(PHONE, DETENTS.half)).toEqual({ width: 390, height: 844, frameHeight: 554, top: 0 });
  });

  it('moves the frame, not the canvas, once the sheet is closed', () => {
    expect(globeFrame(PHONE, DETENTS.closed)).toEqual({ width: 390, height: 844, frameHeight: 554, top: 145 });
  });

  it('frames the whole host on a desktop, with no sheet', () => {
    const desktop = { width: 1392, height: 794, inset: 0, screen: 900 };
    expect(globeFrame(desktop, null)).toEqual({ width: 1392, height: 794, frameHeight: 794, top: 0 });
  });

  it('centres the Moon in the frame, 145 px lower with the sheet closed', () => {
    const centre = new Vector3(0, 0, 0);
    expect(screenPx(globeFrame(PHONE, DETENTS.half), centre).y).toBeCloseTo(277);
    expect(screenPx(globeFrame(PHONE, DETENTS.closed), centre).y).toBeCloseTo(422);
    expect(screenPx(globeFrame(PHONE, DETENTS.closed), centre).x).toBeCloseTo(195);
  });

  it('keeps the zoom: the Moon is as big as in a canvas of the frame size', () => {
    const limb = new Vector3(0, 1, 0);
    const alone = { width: 390, height: 554, frameHeight: 554, top: 0 };
    const radius = (frame: StageFrame): number => screenPx(frame, new Vector3()).y - screenPx(frame, limb).y;
    const closed = globeFrame(PHONE, DETENTS.closed);
    expect(radius(closed)).toBeCloseTo(radius(alone));
    expect(radius(closed)).toBeGreaterThan(50);
  });
});
