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
import { computeRangeMetrics } from '../src/metrics.ts';
import { inPermanentShadow, shadowedHours } from '../src/shadow.ts';
import type { SiteShadow } from '../src/site.ts';
import { computedHours } from '../src/sky.ts';
import { hasEarth, hasSun, isWindow } from '../src/visibility.ts';
import { T0, series } from './factories.ts';

const SOURCE = { label: 'NASA PGDA', url: 'https://pgda.gsfc.nasa.gov/products/69' };
const PSR: SiteShadow = { kind: 'psr', avgSun: 0, source: SOURCE };
const DIM: SiteShadow = { kind: 'dimFloor', avgSun: 0.1078, source: SOURCE };

// Sun up and Earth up, Sun up alone, Earth up alone, neither.
const HOURS = series([[5, 6], [5, 1], [-2, 6], [-2, 1]]);

describe('inPermanentShadow', () => {
  it('holds only for a point on a permanently shadowed floor', () => {
    expect(inPermanentShadow(PSR)).toBe(true);
    expect(inPermanentShadow(DIM)).toBe(false);
    expect(inPermanentShadow(undefined)).toBe(false);
  });
});

describe('shadowedHours', () => {
  it('hides the Sun in every hour of a site in permanent shadow', () => {
    const hours = shadowedHours(HOURS, PSR);
    expect(hours.map(hasSun)).toEqual([false, false, false, false]);
    expect(hours.map(isWindow)).toEqual([false, false, false, false]);
  });

  it('keeps the Earth, the elevations and the DSN as they were', () => {
    const hours = shadowedHours(HOURS, PSR);
    expect(hours.map(hasEarth)).toEqual(HOURS.map(hasEarth));
    expect(hours.map((hour) => ({ ...hour, sunHidden: undefined }))).toEqual(HOURS);
  });

  it('returns the same hours for a dim floor or an unmarked site', () => {
    expect(shadowedHours(HOURS, DIM)).toBe(HOURS);
    expect(shadowedHours(HOURS, undefined)).toBe(HOURS);
  });

  it('gives a month with no Sun and no window, the Earth unchanged', () => {
    const point = { latDeg: -87.45, lonEastDeg: -5.17 };
    const raw = computedHours(point, T0, '2026-11-30T23:00:00Z');
    const before = computeRangeMetrics(raw, T0);
    const after = computeRangeMetrics(shadowedHours(raw, PSR), T0);
    expect(before.sunPct).toBeGreaterThan(0);
    expect(after.sunPct).toBe(0);
    expect(after.windowPct).toBe(0);
    expect(after.longestWindow).toBeNull();
    expect(after.earthPct).toBe(before.earthPct);
    expect(after.longestNight?.hours).toBe(raw.length);
  });
});
