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

/** The ground shader's constants are written as GLSL float literals. */
import { describe, expect, it } from 'vitest';
import { glslFloat } from '../src/terrain/scene/glsl-float';

describe('glslFloat', () => {
  it('gives whole numbers a decimal point, GLSL ES refuses `0` as a float', () => {
    expect(glslFloat(0)).toBe('0.0');
    expect(glslFloat(1)).toBe('1.0');
    expect(glslFloat(-2)).toBe('-2.0');
  });

  it('leaves fractions and exponent forms alone', () => {
    expect(glslFloat(0.3)).toBe('0.3');
    expect(glslFloat(-0.019)).toBe('-0.019');
    expect(glslFloat(1.46e-7)).toBe('1.46e-7');
    expect(glslFloat(1e21)).toBe('1e+21');
  });

  it('refuses what has no literal', () => {
    expect(() => glslFloat(Number.NaN)).toThrow(RangeError);
    expect(() => glslFloat(Infinity)).toThrow(RangeError);
  });
});
