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
 * The Liquid glass's lens map (VENT-27): the backdrop is pulled in from
 * every edge within the bezel, most at the edge, and the middle is left
 * untouched (128, 128).
 */
import { describe, expect, it } from 'vitest';
import {
  lensBezel, lensMap, MAX_BEZEL, type LensBox,
} from '../src/glass/lens-map';

const BOX: LensBox = { width: 120, height: 80, radius: 18, bezel: 22 };

/** The [red, green, blue, alpha] of the pixel at (x, y). */
function pixel(box: LensBox, x: number, y: number): number[] {
  const at = (y * box.width + x) * 4;
  return [...lensMap(box).slice(at, at + 4)];
}

describe('lensBezel', () => {
  it('is MAX_BEZEL on a large surface', () => {
    expect(lensBezel(400, 300)).toBe(MAX_BEZEL);
  });

  it('is the shorter side over 2.2 on a small one', () => {
    expect(lensBezel(200, 22)).toBeCloseTo(10);
  });
});

describe('lensMap', () => {
  it('has one RGBA pixel per point of the box', () => {
    expect(lensMap(BOX)).toHaveLength(120 * 80 * 4);
  });

  it('leaves the centre neutral, opaque, with blue at 128', () => {
    expect(pixel(BOX, 60, 40)).toEqual([128, 128, 128, 255]);
  });

  it('pulls inward at each edge, along its normal only', () => {
    // The outermost pixel's centre is 0.5 px in: a pull of
    // 127 × (1 − 0.5 / 22)² ≈ 121.
    expect(pixel(BOX, 0, 40)).toEqual([249, 128, 128, 255]);
    expect(pixel(BOX, 119, 40)).toEqual([7, 128, 128, 255]);
    expect(pixel(BOX, 60, 0)).toEqual([128, 249, 128, 255]);
    expect(pixel(BOX, 60, 79)).toEqual([128, 7, 128, 255]);
  });

  it('pulls less the further in, and not at all past the bezel', () => {
    const red = (x: number) => pixel(BOX, x, 40)[0] ?? 0;
    expect(red(0)).toBeGreaterThan(red(5));
    expect(red(5)).toBeGreaterThan(red(15));
    expect(red(15)).toBeGreaterThan(128);
    expect(red(22)).toBe(128);
  });

  it('pulls a corner in diagonally, toward the centre', () => {
    const [topLeftR, topLeftG] = pixel(BOX, 2, 2);
    const [bottomRightR, bottomRightG] = pixel(BOX, 117, 77);
    expect(topLeftR).toBeGreaterThan(128);
    expect(topLeftG).toBeGreaterThan(128);
    expect(bottomRightR).toBeLessThan(128);
    expect(bottomRightG).toBeLessThan(128);
    expect(topLeftR).toBe(topLeftG);
  });
});
