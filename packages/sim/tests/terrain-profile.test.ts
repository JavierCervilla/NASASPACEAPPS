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
import { SUN_RADIUS_DEG, sunDiscVisible } from '../src/sun-disc.ts';
import { decodeProfile, encodeProfile } from '../src/terrain-codec.ts';
import { terrainHours } from '../src/terrain-hours.ts';
import {
  horizonAt,
  isAboveTerrain,
  quantiseDeg,
  type HorizonProfile,
} from '../src/terrain-profile.ts';
import { earthLink, hasEarth, hasSun, isWindow } from '../src/visibility.ts';
import { series } from './factories.ts';

/** A profile at `deg` in every one of `bins` azimuths. */
function flat(deg: number, bins = 720): HorizonProfile {
  return { centiDeg: new Int16Array(bins).fill(quantiseDeg(deg)) };
}

/** A profile rising from 0° at north to 4° at east, linearly, 4 bins. */
const RAMP: HorizonProfile = { centiDeg: Int16Array.from([0, 400, 0, -200]) };

describe('horizonAt', () => {
  it('reads bin centres and between them linearly, wrapping at north', () => {
    expect(horizonAt(RAMP, 0)).toBe(0);
    expect(horizonAt(RAMP, 90)).toBe(4);
    expect(horizonAt(RAMP, 45)).toBe(2);
    expect(horizonAt(RAMP, 315)).toBe(-1);
    expect(horizonAt(RAMP, 360 + 90)).toBe(4);
    expect(horizonAt(RAMP, -270)).toBe(4);
  });

  it('says what stands above it', () => {
    expect(isAboveTerrain(RAMP, 90, 4.01)).toBe(true);
    expect(isAboveTerrain(RAMP, 90, 4)).toBe(false);
    expect(isAboveTerrain(RAMP, 270, -1.5)).toBe(true);
  });
});

describe('quantiseDeg', () => {
  it('rounds to hundredths half up and clamps to 16 bits', () => {
    expect(quantiseDeg(1.234)).toBe(123);
    expect(quantiseDeg(1.235)).toBe(124);
    expect(quantiseDeg(-0.004)).toBe(0);
    expect(quantiseDeg(-90)).toBe(-9000);
    expect(quantiseDeg(400)).toBe(32767);
  });
});

describe('encodeProfile / decodeProfile', () => {
  it('round-trips every value, odd byte counts of base64 included', () => {
    for (const n of [1, 2, 3, 720]) {
      const centiDeg = Int16Array.from({ length: n }, (_, i) => i * 97 - 9000);
      const text = encodeProfile({ centiDeg });
      expect(decodeProfile(text).centiDeg).toEqual(centiDeg);
    }
  });

  it('writes little-endian int16 in standard base64', () => {
    const text = encodeProfile({ centiDeg: Int16Array.from([1, -2]) });
    expect(text).toBe('AQD+/w==');
    expect(encodeProfile(flat(0)).length).toBe(1920);
  });

  it('refuses text that is not a profile', () => {
    expect(() => decodeProfile('AQD*')).toThrow(RangeError);
    expect(() => decodeProfile('AQ==')).toThrow(RangeError);
  });
});

describe('sunDiscVisible', () => {
  it('is whole above, none below and half with the centre on it', () => {
    const terrain = flat(2);
    expect(sunDiscVisible(terrain, 10, 2 + SUN_RADIUS_DEG + 0.01)).toBe(1);
    expect(sunDiscVisible(terrain, 10, 2 - SUN_RADIUS_DEG - 0.01)).toBe(0);
    expect(sunDiscVisible(terrain, 10, 2)).toBeCloseTo(0.5, 2);
  });

  it('is the IAU nominal Sun at one astronomical unit', () => {
    expect(SUN_RADIUS_DEG).toBeCloseTo(0.266453, 6);
  });
});

describe('terrainHours', () => {
  // Sun up and Earth up, Sun up alone, Earth up alone, neither.
  const HOURS = series([[5, 6], [5, 1], [-2, 6], [-2, 1]]);

  it('returns the same hours without a profile', () => {
    expect(terrainHours(HOURS, undefined)).toBe(HOURS);
  });

  it('hides a Sun and an Earth under a 5.5° ridge, keeping elevations', () => {
    const hours = terrainHours(HOURS, flat(5.5));
    expect(hours.map(hasSun)).toEqual([false, false, false, false]);
    expect(hours.map(hasEarth)).toEqual([true, false, true, false]);
    expect(hours.map(isWindow)).toEqual([false, false, false, false]);
    expect(hours.map((h) => h.sunEl)).toEqual(HOURS.map((h) => h.sunEl));
    expect(hours[0]?.sunDisc).toBe(0);
  });

  it('shows a Sun below 0° to a point that sees down to -3°', () => {
    const hours = terrainHours(HOURS, flat(-3));
    expect(hours.map(hasSun)).toEqual([true, true, true, true]);
    expect(hours.map(hasEarth)).toEqual(HOURS.map(hasEarth));
  });

  it('still lets permanent shadow win', () => {
    const [hour] = terrainHours(series([[5, 6]]), flat(-3));
    expect(hasSun({ ...hour!, sunHidden: true })).toBe(false);
  });
});

describe('earthLink with the terrain', () => {
  it('is below when the terrain hides the Earth, whatever its elevation', () => {
    expect(earthLink(20, false)).toBe('below');
    expect(earthLink(20, true)).toBe('link');
    expect(earthLink(2, true)).toBe('low');
    expect(earthLink(20)).toBe('link');
  });
});
