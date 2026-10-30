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

/** Which edges of the site card's scroll box fade (lib/scroll-edges.ts): the QA cut-off card at 1280x720. */
import { describe, expect, it } from 'vitest';
import { scrollEdges } from '../src/lib/scroll-edges';

/** The card QA measured at 1280x720: 518 px of content in a 363 px box. */
const CARD = { scrollHeight: 518, clientHeight: 363 };

describe('scroll edges', () => {
  it('fades the bottom only, at the top of a box with more below', () => {
    expect(scrollEdges({ ...CARD, scrollTop: 0 })).toEqual({ top: false, bottom: true });
  });

  it('fades both edges in the middle', () => {
    expect(scrollEdges({ ...CARD, scrollTop: 80 })).toEqual({ top: true, bottom: true });
  });

  it('fades the top only at the end', () => {
    expect(scrollEdges({ ...CARD, scrollTop: 155 })).toEqual({ top: true, bottom: false });
  });

  it('fades nothing when everything fits', () => {
    expect(scrollEdges({ scrollTop: 0, scrollHeight: 300, clientHeight: 300 })).toEqual({ top: false, bottom: false });
  });

  it('takes a sub-pixel remainder for the end, not for more content', () => {
    expect(scrollEdges({ ...CARD, scrollTop: 154.5 })).toEqual({ top: true, bottom: false });
    expect(scrollEdges({ ...CARD, scrollTop: 0.5 })).toEqual({ top: false, bottom: true });
  });
});
