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
 * The on-foot notice's band on a phone (VENT-51): the free band between
 * the top bar and the sheet, in the stage's px, and whether the notice
 * fits in it or the sheet has to make room.
 */
import { describe, expect, it } from 'vitest';
import { bandInStage, noticeFits } from '../src/terrain/status-band';

describe('the notice band', () => {
  it('is the band between the top bar and the sheet, in the stage', () => {
    expect(bandInStage({ top: 72, bottom: 290 }, 0)).toEqual({ top: 72, height: 218 });
    expect(bandInStage({ top: 72, bottom: 290 }, 20)).toEqual({ top: 52, height: 218 });
  });

  it('is empty, never negative, when the sheet rises over the top bar', () => {
    expect(bandInStage({ top: 245, bottom: 219 }, 0)).toEqual({ top: 245, height: 0 });
  });

  it('starts at the stage when the bar is above it', () => {
    expect(bandInStage({ top: -10, bottom: 300 }, 0)).toEqual({ top: 0, height: 300 });
  });

  it('fits a notice no taller than the band, and not a taller one', () => {
    const band = { top: 72, height: 218 };
    expect(noticeFits(124, band)).toBe(true);
    expect(noticeFits(218, band)).toBe(true);
    expect(noticeFits(219, band)).toBe(false);
    expect(noticeFits(1, { top: 245, height: 0 })).toBe(false);
  });
});
