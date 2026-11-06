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

/** The drawing-buffer height the Moon's map is chosen for (VENT-97). */
import { PerspectiveCamera, Vector2, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { frameBufferPx } from '../src/globe/frame';
import { frameCamera } from '../src/globe/stage';

const renderer = (width: number, height: number, ratio: number) =>
  ({
    getSize: (target: Vector2) => target.set(width, height),
    getPixelRatio: () => ratio,
  }) as unknown as WebGLRenderer;

describe('frameBufferPx', () => {
  it('is the canvas height times the pixel ratio when the camera has no view offset', () => {
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    expect(frameBufferPx({ camera, renderer: renderer(1440, 900, 2) })).toBe(1800);
  });

  it('is the framed band, not the whole canvas, on a phone whose sheet leaves 290 px out', () => {
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    frameCamera(camera, { width: 412, height: 880, frameHeight: 590, top: 0 });
    expect(frameBufferPx({ camera, renderer: renderer(412, 880, 1.75) })).toBeCloseTo(1032.5, 6);
  });
});
