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

import { describe, expect, it, vi } from 'vitest';
import { FreeBandWatch, freeBand } from '../src/globe/free-band';

const INF = Number.POSITIVE_INFINITY;

describe('free band', () => {
  it('on a phone runs from the top bar\'s bottom to the sheet\'s top edge, with no card above the sheet', () => {
    // 390x844 at half: the bar's bottom at 81, the sheet's edge at 500.
    expect(freeBand({ hostHeight: 844, barBottom: 81, sheetTop: 500, tabsTop: 762 })).toEqual({ top: 81, bottom: 500 });
  });

  it('with the sheet closed (below the screen) ends at the tab bar', () => {
    expect(freeBand({ hostHeight: 844, barBottom: 81, sheetTop: 900, tabsTop: 762 })).toEqual({ top: 81, bottom: 762 });
  });

  it('on a desktop is the whole globe', () => {
    expect(freeBand({ hostHeight: 640, barBottom: 0, sheetTop: INF, tabsTop: INF })).toEqual({ top: 0, bottom: 640 });
  });

  it('tells its watchers only when the band moves, until they stop', () => {
    const band = new FreeBandWatch();
    const heard = vi.fn();
    const stop = band.watch(heard);
    band.layout({ hostHeight: 844, barBottom: 81, tabsTop: 762 });
    expect(band.band()).toEqual({ top: 81, bottom: 762 });
    band.layout({ sheetTop: 500 });
    expect(band.band()).toEqual({ top: 81, bottom: 500 });
    // A sheet edge below the tab bar leaves the band where it was.
    band.layout({ sheetTop: 800 });
    band.layout({ sheetTop: 900 });
    expect(heard).toHaveBeenCalledTimes(3);
    stop();
    band.layout({ sheetTop: 500 });
    expect(heard).toHaveBeenCalledTimes(3);
  });
});
