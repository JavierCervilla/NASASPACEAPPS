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

import { describe, expect, it } from 'vitest';
import { ARMS, lowerArms } from '../scripts/astronaut-mesh.mjs';

describe('the astronaut build lowers the arms', () => {
  it('turns a hand held out down beside the hip, and its normal with it', () => {
    const positions = [ARMS.startX + ARMS.rampX + 4, ARMS.shoulderY, 0];
    const normals = [1, 0, 0];
    lowerArms(positions, normals);
    const [x, y, z] = positions;
    expect(y).toBeLessThan(ARMS.shoulderY - 5);
    expect(x).toBeLessThan(ARMS.startX + ARMS.rampX + 4);
    expect(z).toBeCloseTo(ARMS.forward, 6);
    expect(Math.hypot(normals[0] ?? 0, normals[1] ?? 0)).toBeCloseTo(1, 6);
    expect(normals[1]).toBeLessThan(0);
  });

  it('leaves the body and the legs alone', () => {
    const positions = [3, 30, 1, ARMS.startX + 2, ARMS.minY - 1, 0];
    const before = [...positions];
    lowerArms(positions, null);
    expect(positions).toEqual(before);
  });

  it('bends both sides alike, mirrored', () => {
    const right = [ARMS.startX + 3, 25, 0];
    const left = [-(ARMS.startX + 3), 25, 0];
    lowerArms(right, null);
    lowerArms(left, null);
    expect(left[0]).toBeCloseTo(-(right[0] ?? 0), 9);
    expect(left[1]).toBeCloseTo(right[1] ?? 0, 9);
  });
});
