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
import { settingsFor } from '../src/lib/quality';
import { terrainPixelRatio } from '../src/terrain/pixel-ratio';

describe('the on-foot view pixel ratio (VENT-73)', () => {
  it('caps a phone at the medium tier at 1.25', () => {
    expect(terrainPixelRatio(settingsFor('medium'), true, 2.625)).toBe(1.25);
  });

  it('leaves a desktop at the medium tier at the tier cap', () => {
    expect(terrainPixelRatio(settingsFor('medium'), false, 2)).toBe(1.75);
  });

  it('never goes above the device ratio or the tier cap', () => {
    expect(terrainPixelRatio(settingsFor('medium'), true, 1)).toBe(1);
    expect(terrainPixelRatio(settingsFor('low'), true, 3)).toBe(1.25);
    expect(terrainPixelRatio(settingsFor('high'), false, 3)).toBe(2);
  });
});
