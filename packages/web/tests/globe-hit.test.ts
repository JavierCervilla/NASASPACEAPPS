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
import { HIT_HALF_PX } from '../src/globe/marker-cull';
import { nearestMarker, pickedSite } from '../src/globe/marker-hit';

// Two dots closer than a hit box, as IM-1 and IM-2 sit at the opening zoom: each box covers the other's centre.
const GAP = 20;
const IM1 = { id: 'im1-odysseus', at: { x: 100, y: 100 } };
const IM2 = { id: 'im2-athena', at: { x: 100 + GAP, y: 100 } };
const PLACED = [IM1, IM2];

/** A click whose target is the button of site `targetId`, at `x, y` px in the layer. */
function click(targetId: string, x: number, y: number, detail = 1): MouseEvent {
  const target = { dataset: { siteId: targetId } };
  return { target, clientX: x, clientY: y, detail } as unknown as MouseEvent;
}

const ROOT = { getBoundingClientRect: () => ({ left: 0, top: 0 }) } as HTMLElement;

describe('nearestMarker', () => {
  it('gives each dot its own centre, though the other box covers it', () => {
    expect(nearestMarker(PLACED, IM1.at)?.id).toBe('im1-odysseus');
    expect(nearestMarker(PLACED, IM2.at)?.id).toBe('im2-athena');
  });

  it('keeps the whole box where it does not overlap another', () => {
    expect(nearestMarker(PLACED, { x: 100 - HIT_HALF_PX + 1, y: 100 + HIT_HALF_PX - 1 })?.id).toBe('im1-odysseus');
  });

  it('is null outside every box', () => {
    expect(nearestMarker(PLACED, { x: 100 - HIT_HALF_PX, y: 100 })).toBeNull();
  });
});

describe('pickedSite', () => {
  it('routes a mouse click on the box on top to the dot under the pointer', () => {
    expect(pickedSite(click('im2-athena', 100, 100), ROOT, PLACED)).toBe('im1-odysseus');
  });

  it('measures the pointer from the layer, not the page', () => {
    const shifted = { getBoundingClientRect: () => ({ left: 50, top: 30 }) } as HTMLElement;
    expect(pickedSite(click('im1-odysseus', 50 + 100 + GAP, 30 + 100), shifted, PLACED)).toBe('im2-athena');
  });

  it('picks the focused marker on a keyboard click, which has no pointer', () => {
    expect(pickedSite(click('im2-athena', 0, 0, 0), ROOT, PLACED)).toBe('im2-athena');
  });

  it('picks nothing off a marker', () => {
    const off = { target: { dataset: {} }, clientX: 100, clientY: 100, detail: 1 } as unknown as MouseEvent;
    expect(pickedSite(off, ROOT, PLACED)).toBeUndefined();
  });
});
