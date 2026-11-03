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
import { keptLabels } from '../src/terrain/scene/label-declutter';

const box = (left: number, top: number, width: number, height: number) =>
  ({ left, top, right: left + width, bottom: top + height });

describe('the on-foot labels that stay shown (VENT-52)', () => {
  it('keeps every label when none overlaps another', () => {
    expect(keptLabels([box(0, 0, 50, 20), box(60, 0, 50, 20), box(0, 30, 50, 20)])).toEqual([true, true, true]);
  });

  it('leaves out a label that overlaps one placed before it, in the order given', () => {
    // The ridge's label at 200 % text over the 100 m ring's (IM-2, 30 November 2026, 20:00 UTC).
    const ridge = box(93, 215, 204, 35);
    const ring100 = box(268, 235, 78, 35);
    const ring25 = box(85, 254, 64, 35);
    expect(keptLabels([ridge, ring25, ring100])).toEqual([true, true, false]);
  });

  it('keeps a hidden label hidden and lets the next one take its place', () => {
    expect(keptLabels([null, box(0, 0, 50, 20), box(10, 5, 50, 20)])).toEqual([false, true, false]);
  });

  it('keeps two labels that only touch at an edge', () => {
    expect(keptLabels([box(0, 0, 50, 20), box(50, 0, 50, 20), box(0, 20, 50, 20)])).toEqual([true, true, true]);
  });
});
