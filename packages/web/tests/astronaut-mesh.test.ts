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
import { ARMS, COVERED_MARKS, lowerArms } from '../scripts/astronaut-mesh.mjs';

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

describe('the marks the build covers on the suit texture', () => {
  type Rect = { left: number; top: number; width: number; height: number };
  const contains = (r: Rect, x: number, y: number) => x >= r.left && x < r.left + r.width && y >= r.top && y < r.top + r.height;
  const overlaps = (a: Rect, b: Rect) =>
    a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

  it('covers the NASA insignia on the backpack and the mission patch on the suit', () => {
    const names = COVERED_MARKS.map((mark) => mark.name);
    expect(names).toEqual(['nasa-insignia', 'mission-patch']);
    const [insignia, patch] = COVERED_MARKS.map((mark) => mark.area);
    // The «meatball» sits around (920, 210) of the 1024 px texture; the patch, with its grey ground, (793-862, 388-438).
    expect(contains(insignia!, 920, 210)).toBe(true);
    for (const [x, y] of [[793, 388], [862, 388], [793, 438], [862, 438], [828, 412]] as const) {
      expect(contains(patch!, x, y)).toBe(true);
    }
  });

  it('takes each cover from plain fabric of the same size, clear of every mark, inside the texture', () => {
    for (const { area, from } of COVERED_MARKS) {
      const source = { ...from, width: area.width, height: area.height };
      for (const mark of COVERED_MARKS) expect(overlaps(source, mark.area)).toBe(false);
      expect(source.left + source.width).toBeLessThanOrEqual(1024);
      expect(source.top + source.height).toBeLessThanOrEqual(1024);
    }
  });
});
