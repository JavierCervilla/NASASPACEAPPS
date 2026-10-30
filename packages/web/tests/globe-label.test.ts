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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { labelPlacement } from '../src/globe/marker-button';
import { SiteLabel } from '../src/globe/site-label';

// The label of the phone e2e: about 168 x 46 px (two lines), in a 390 px wide host.
const SIZE = { width: 168, height: 46 };
const WIDE = 390;

describe('labelPlacement', () => {
  it('rides next to its marker when there is room', () => {
    expect(labelPlacement({ x: 100, y: 200 }, SIZE, { width: WIDE, bottom: 500 })).toEqual({ x: 100, y: 200, flip: false });
  });

  it('flips to the left of a marker near the right edge', () => {
    expect(labelPlacement({ x: 300, y: 200 }, SIZE, { width: WIDE, bottom: 500 })?.flip).toBe(true);
  });

  it('rises to stay above the sheet when its marker is just above the sheet edge', () => {
    const placed = labelPlacement({ x: 100, y: 480 }, SIZE, { width: WIDE, bottom: 500 });
    // Its box (10 px below the point it is placed at) ends 8 px above the sheet edge.
    expect(placed).toEqual({ x: 100, y: 500 - 8 - 10 - SIZE.height, flip: false });
  });

  it('hides when its marker is under the sheet', () => {
    expect(labelPlacement({ x: 100, y: 501 }, SIZE, { width: WIDE, bottom: 500 })).toBeNull();
  });

  it('is not clipped without a sheet (an infinite bottom)', () => {
    expect(labelPlacement({ x: 100, y: 800 }, SIZE, { width: WIDE, bottom: Infinity })?.y).toBe(800);
  });
});

/** The label element the class creates, measured as the browser would. */
function fakeLabelElement() {
  return {
    className: '',
    hidden: false,
    textContent: '',
    offsetWidth: SIZE.width,
    offsetHeight: SIZE.height,
    style: { transform: '' },
    classList: { toggle: vi.fn() },
  };
}

describe('SiteLabel', () => {
  afterEach(() => vi.unstubAllGlobals());

  const install = () => {
    const el = fakeLabelElement();
    vi.stubGlobal('document', { createElement: () => el });
    return el;
  };

  it('hides when the sheet rises over its marker, and comes back when it falls', () => {
    const el = install();
    const label = new SiteLabel();
    label.follow({ x: 100, y: 480 }, WIDE);
    expect(el.hidden).toBe(false);
    expect(el.style.transform).toBe('translate3d(100px, 480px, 0)');
    label.clip(96);
    expect(el.hidden).toBe(true);
    label.clip(500);
    expect(el.hidden).toBe(false);
    expect(el.style.transform).toBe(`translate3d(100px, ${500 - 8 - 10 - SIZE.height}px, 0)`);
  });

  it('stays hidden with no marker to follow', () => {
    const el = install();
    const label = new SiteLabel();
    expect(el.hidden).toBe(true);
    label.follow(null, WIDE);
    label.clip(500);
    expect(el.hidden).toBe(true);
  });
});
