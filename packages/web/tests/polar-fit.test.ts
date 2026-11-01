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
import { fitDisk, LABEL_PX, type KeyBox } from '../src/polar/disk-fit';

/** The circle's distance to a box, minus its radius: negative when they overlap. */
function clearOf(centre: { x: number; y: number }, r: number, box: KeyBox): number {
  const dx = Math.max(box.left - centre.x, 0, centre.x - box.right);
  const dy = Math.max(box.top - centre.y, 0, centre.y - box.bottom);
  return Math.hypot(dx, dy) - r;
}

// The polar panel at 1440 x 900 and its keys, as measured on the page.
const PANEL = { width: 1056, height: 540 };
const LAYERS: KeyBox = { left: 20, top: 245, right: 292, bottom: 520 };
const NUMBERED: KeyBox = { left: 808, top: 395, right: 1036, bottom: 520 };

describe('the polar disk beside its keys', () => {
  it('is as large as the panel allows when no key is in the way', () => {
    expect(fitDisk(PANEL, [])).toEqual({ size: 476, centreX: 528 });
  });

  it('moves away from the keys before it shrinks, clear of both, its edge label too', () => {
    const fit = fitDisk(PANEL, [LAYERS, NUMBERED]);
    const r = fit.size / 2;
    const centre = { x: fit.centreX, y: PANEL.height / 2 };
    expect(fit.size).toBeGreaterThanOrEqual(460);
    expect(clearOf(centre, r, LAYERS)).toBeGreaterThan(LABEL_PX);
    expect(clearOf(centre, r, NUMBERED)).toBeGreaterThan(0);
  });

  it('shrinks when moving is not enough', () => {
    const narrow = { width: 700, height: 540 };
    const fit = fitDisk(narrow, [LAYERS, { ...NUMBERED, left: 452, right: 680 }]);
    expect(fit.size).toBeLessThan(476);
    expect(fit.centreX - fit.size / 2 - LABEL_PX).toBeGreaterThanOrEqual(LAYERS.right);
  });
});
