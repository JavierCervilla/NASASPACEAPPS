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
 * The fine relief's feather (VENT-62; the technique of Mooner's
 * fine-feather.ts): chamfer distance from the pixels the fine source does
 * not cover, and a smooth ramp from it.
 */
import { describe, expect, it } from 'vitest';
import { FEATHER_PX, chamferPx, featherWeights } from '../src/terrain/fine/fine-feather';

const ones = (n: number): Uint8Array => new Uint8Array(n * n).fill(1);

describe('chamferPx', () => {
  it('counts the tile\'s outside as not covered', () => {
    const d = chamferPx(ones(9), 9, 9);
    expect(d[0]).toBeCloseTo(1, 6);
    expect(d[4 * 9 + 4]).toBeCloseTo(5, 6);
  });

  it('is 0 on pixels the source does not cover, about √2 on a diagonal', () => {
    const mask = ones(9);
    mask[4 * 9 + 4] = 0;
    const d = chamferPx(mask, 9, 9);
    expect(d[4 * 9 + 4]).toBe(0);
    expect(d[4 * 9 + 5]).toBeCloseTo(1, 6);
    expect(d[5 * 9 + 5]).toBeCloseTo(4 / 3, 6);
  });
});

describe('featherWeights', () => {
  const n = 2 * FEATHER_PX + 5;
  const w = featherWeights(ones(n), n, n);
  const at = (x: number, y: number) => w[y * n + x] ?? 0;

  it('is 0 at the edge and 255 well inside', () => {
    expect(at(0, 0)).toBe(0);
    expect(at(n >> 1, n >> 1)).toBe(255);
  });

  it('rises without falling toward the inside', () => {
    let last = -1;
    for (let x = 0; x <= n >> 1; x++) {
      expect(at(x, n >> 1)).toBeGreaterThanOrEqual(last);
      last = at(x, n >> 1);
    }
  });

  it('is 0 on a LOLA pixel of the mask', () => {
    const mask = ones(n);
    mask[(n >> 1) * n + (n >> 1)] = 0;
    expect(featherWeights(mask, n, n)[(n >> 1) * n + (n >> 1)]).toBe(0);
  });
});
