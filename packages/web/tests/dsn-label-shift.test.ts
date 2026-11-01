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
import { labelShift } from '../src/dsn/label-shift';

/** The picture's width, a phone's DSN Earth at 360 px. */
const SPAN = 312;

describe('labelShift', () => {
  it('leaves a label inside the picture where it is', () => {
    expect(labelShift(40, 100, SPAN)).toBe(0);
  });

  it('moves a label past the left edge right, to the edge', () => {
    expect(labelShift(-30, 100, SPAN)).toBe(30);
  });

  it('moves a label past the right edge left, to the edge', () => {
    expect(labelShift(260, 100, SPAN)).toBe(-48);
  });

  it('starts a label wider than the picture at its left edge', () => {
    expect(labelShift(-50, 400, SPAN)).toBe(50);
    expect(labelShift(10, 400, SPAN)).toBe(-10);
  });

  it('leaves a label touching both edges alone', () => {
    expect(labelShift(0, SPAN - 1, SPAN)).toBe(0);
  });
});
