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
import { SOUTH_POLE_VIEW } from '../src/globe/framing';
import type { MarkerLayer } from '../src/globe/marker-layer';
import { createOrbit, poseOf } from '../src/globe/orbit';
import { spreadOf } from '../src/globe/pinch';
import { pinchControls, pinchDistance } from '../src/globe/pointer-controls';
import { phoneTier } from '../src/globe/quality-pick';
import { bindSelection, flyTo } from '../src/globe/selection';
import { createSiteFramer } from '../src/globe/site-framer';
import { createSiteStore } from '../src/phone/site-store';

const deps = { invalidate: vi.fn(), reducedMotion: () => false, heightPx: () => 600 };
const APOLLO11 = { id: 'apollo11', name: 'Apollo 11', lat: 0.67416, lonEast: 23.47314, approximate: false };

describe('phone tier', () => {
  it('never runs the high tier on a phone', () => {
    expect(phoneTier('high', true)).toBe('medium');
    expect(phoneTier('low', true)).toBe('low');
    expect(phoneTier('high', false)).toBe('high');
  });
});

describe('pinch', () => {
  it('measures the spread of exactly two fingers', () => {
    expect(spreadOf(new Map([[1, { x: 0, y: 0 }], [2, { x: 3, y: 4 }]]))).toBe(5);
    expect(spreadOf(new Map([[1, { x: 0, y: 0 }]]))).toBe(0);
    expect(spreadOf(new Map([[1, { x: 0, y: 0 }], [2, { x: 3, y: 4 }], [3, { x: 1, y: 1 }]]))).toBe(0);
  });

  it('shrinks the altitude by the spread ratio', () => {
    expect(pinchDistance(5, 2)).toBe(3);
    expect(pinchDistance(3, 0.5)).toBe(5);
  });

  it('zooms the orbit 1:1 with the fingers, within the limits', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    pinchControls(orbit, deps)(2);
    expect(poseOf(orbit).distance).toBe(3);
    pinchControls(orbit, deps)(100);
    expect(poseOf(orbit).distance).toBe(1.6);
  });
});

describe('selection', () => {
  it('turns the globe to a site the short way round', () => {
    const orbit = createOrbit({ latDeg: -62, lonEastDeg: 350, distance: 5 });
    flyTo(orbit, { lat: 0, lonEast: 10 }, true);
    expect(poseOf(orbit)).toEqual({ latDeg: 0, lonEastDeg: 370, distance: 5 });
  });

  const setUp = () => {
    const store = createSiteStore('im2-athena');
    const markers = { select: vi.fn() } as unknown as MarkerLayer & { select: ReturnType<typeof vi.fn> };
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const invalidate = vi.fn();
    // No frame set yet: the framer only flies.
    const band = { band: () => ({ top: 0, bottom: 800 }), watch: () => () => undefined };
    const framer = createSiteFramer({ orbit, camera: { view: null }, band, invalidate, reducedMotion: () => true });
    const unbind = bindSelection({ store, markers, framer }, () => [APOLLO11]);
    return { store, markers, orbit, unbind };
  };

  it('selects the marker and flies to a site picked in the list', () => {
    const { store, markers, orbit } = setUp();
    store.select('apollo11', 'list');
    expect(markers.select).toHaveBeenCalledWith('apollo11');
    expect(poseOf(orbit).latDeg).toBeCloseTo(0.67416);
  });

  it('does not move the globe under a marker tapped on it', () => {
    const { store, markers, orbit } = setUp();
    store.select('apollo11', 'globe');
    expect(markers.select).toHaveBeenCalledWith('apollo11');
    expect(poseOf(orbit)).toEqual(SOUTH_POLE_VIEW);
  });

  it('stops following the store once unbound', () => {
    const { store, markers, unbind } = setUp();
    unbind();
    store.select('apollo11', 'list');
    expect(markers.select).not.toHaveBeenCalled();
  });
});
