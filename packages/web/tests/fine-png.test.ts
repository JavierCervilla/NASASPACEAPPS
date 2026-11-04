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
 * The grey PNG reader for the fine tiles (VENT-62): 16-bit heights and
 * 1-bit masks, which a canvas would flatten to 8 bits.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeGreyPng } from '../src/terrain/fine/png-grey';

const tile = (file: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`../public/fine-tiles/mons-mouton/${file}`, import.meta.url)));

describe('decodeGreyPng', () => {
  it('reads the 16-bit heights at full depth', async () => {
    const png = await decodeGreyPng(tile('heights.png'));
    expect([png.width, png.height, png.bitDepth]).toEqual([300, 300, 16]);
    expect(png.samples).toHaveLength(300 * 300);
    // tile.json: min 5275.17 m, max 5358.38 m at 0.01 m over 5275.
    let [lo, hi] = [Infinity, -Infinity];
    for (const v of png.samples) [lo, hi] = [Math.min(lo, v), Math.max(hi, v)];
    expect(lo / 100 + 5275).toBeCloseTo(5275.17, 1);
    expect(hi / 100 + 5275).toBeCloseTo(5358.38, 1);
  });

  it('reads the 1-bit mask as one sample per pixel with the right share', async () => {
    const png = await decodeGreyPng(tile('mask.png'));
    expect([png.width, png.height, png.bitDepth]).toEqual([300, 300, 1]);
    const share = png.samples.reduce((a, v) => a + v, 0) / png.samples.length;
    expect(share).toBeCloseTo(0.9781, 3);
  });

  it('rejects what is not a PNG', async () => {
    await expect(decodeGreyPng(new Uint8Array(20))).rejects.toThrow(/PNG/);
  });
});
