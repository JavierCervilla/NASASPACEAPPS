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
 * The standing pin as an obstacle for the graticule's labels (VENT-55, V-19): the pin is no site marker and the
 * «Saved sites» layer leaves the selected point to it, so a label could stand on its ring. A cover-only layer hands
 * the pin's disc to the labels, the size of a selected marker's ring.
 */
import { describe, expect, it } from 'vitest';
import { coverLayer } from '../src/globe/layers/cover-layer';
import { RING_RADIUS_PX } from '../src/globe/graticule/clearance';
import type { LayerFrame } from '../src/globe/layers/registry';

const AT = { x: 120, y: 80 };
const facing: LayerFrame = { project: () => AT };
const behind: LayerFrame = { project: () => null };
const RIM = { lat: -85.87, lonEast: 61.34 };

describe('the standing pin\'s cover', () => {
  it('covers nothing before a pin stands', () => {
    const layer = coverLayer(RING_RADIUS_PX);
    layer.place?.(facing);
    expect(layer.covers?.()).toEqual([]);
  });

  it('covers the pin\'s point with a selected ring\'s disc once placed', () => {
    const layer = coverLayer(RING_RADIUS_PX);
    layer.setPoint(RIM);
    layer.place?.(facing);
    expect(layer.covers?.()).toEqual([{ at: AT, radius: RING_RADIUS_PX }]);
  });

  it('covers nothing behind the limb, and nothing once the pin is taken away', () => {
    const layer = coverLayer(RING_RADIUS_PX);
    layer.setPoint(RIM);
    layer.place?.(behind);
    expect(layer.covers?.()).toEqual([]);
    layer.place?.(facing);
    layer.setPoint(null);
    expect(layer.covers?.()).toEqual([]);
  });
});
