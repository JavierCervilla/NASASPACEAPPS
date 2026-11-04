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
 * The small craters' law, shape and raster (VENT-64): Trask's count,
 * Basilevsky's classes, Pike's fresh d/D with a rim, and the raster read at
 * two scales.
 */
import { describe, expect, it } from 'vitest';
import {
  DEGRADATION,
  TRASK_PER_M2,
  craterCount,
  depthRatio,
  seededCraters,
} from '../src/terrain/crater-law';
import { profile, stampCrater } from '../src/terrain/crater-profile';
import {
  CRATER_FIELD,
  SCALE_D_MIN_M,
  TILE_M,
  bakeRelief,
  readRelief,
  reliefAt,
} from '../src/terrain/crater-relief';

describe('the count (Trask 1966)', () => {
  it('puts 0.0794 D^-2 craters per m² over D, scale free', () => {
    const { texels, dMin, dMax } = CRATER_FIELD;
    const expected = TRASK_PER_M2 * texels * texels
      * (1 / (dMin * dMin) - 1 / (dMax * dMax));
    expect(craterCount(CRATER_FIELD)).toBe(Math.round(expected));
    expect(craterCount(CRATER_FIELD)).toBeGreaterThan(1500);
    expect(craterCount(CRATER_FIELD)).toBeLessThan(3500);
  });

  it('follows N(>D) ~ D^-2 in the sizes drawn', () => {
    const craters = seededCraters(11, CRATER_FIELD);
    const over = (d: number): number =>
      craters.filter((c) => c.diameter > d).length;
    // The count cut at the largest size: (1/144 - 1/2304) / (1/576 - 1/2304).
    expect(over(12) / over(24)).toBeGreaterThan(4);
    expect(over(12) / over(24)).toBeLessThan(6);
    for (const c of craters) {
      expect(c.diameter).toBeGreaterThanOrEqual(CRATER_FIELD.dMin);
      expect(c.diameter).toBeLessThanOrEqual(CRATER_FIELD.dMax);
    }
  });

  it('is the same for a seed and another for another', () => {
    expect(seededCraters(3, CRATER_FIELD)).toEqual(seededCraters(3, CRATER_FIELD));
    expect(seededCraters(4, CRATER_FIELD)).not.toEqual(seededCraters(3, CRATER_FIELD));
  });
});

describe('the degradation classes (Basilevsky 1976)', () => {
  it('has the five classes, their shares adding to 1', () => {
    expect(DEGRADATION.map((c) => c.name)).toEqual(['A', 'AB', 'B', 'BC', 'C']);
    expect(DEGRADATION.map((c) => c.share)).toEqual([0.005, 0.025, 0.17, 0.3, 0.5]);
    expect(DEGRADATION.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1, 12);
  });

  it('gives each class its d/D range', () => {
    const ranges = [[0.2, 0.25], [0.143, 0.2], [0.1, 0.143], [0.083, 0.1],
      [0.03, 0.083]] as const;
    expect(DEGRADATION.map((c) => c.dd)).toEqual(ranges);
    const edges = [0, 0.005, 0.03, 0.2, 0.5];
    edges.forEach((u, i) => {
      expect(depthRatio(u + 1e-9, 0)).toBeCloseTo(ranges[i]![0], 6);
      expect(depthRatio(u + 1e-9, 1)).toBeCloseTo(ranges[i]![1], 6);
    });
  });

  it('draws the shares of 40000 craters within a point', () => {
    const craters = seededCraters(5, { texels: 8000, dMin: 6, dMax: 48 });
    expect(craters.length).toBeGreaterThan(40000);
    const share = (lo: number, hi: number): number =>
      craters.filter((c) => c.dd >= lo && c.dd < hi).length / craters.length;
    expect(share(0.03, 0.083)).toBeGreaterThan(0.47);
    expect(share(0.03, 0.083)).toBeLessThan(0.53);
    expect(share(0.2, 0.25)).toBeLessThan(0.01);
  });
});

describe('a crater\'s shape (Pike 1977)', () => {
  it('is as deep as its d/D at the centre, and fresh ones have a rim', () => {
    expect(profile(0, 0.2)).toBeCloseTo(-1, 6);
    expect(profile(0, 0.05)).toBeCloseTo(-1, 3);
    const rim = Math.max(...Array.from({ length: 60 }, (_, i) => profile(0.9 + i / 300, 0.2)));
    expect(rim).toBeCloseTo(0.18, 1);
    expect(profile(3, 0.2)).toBeLessThan(0.01);
  });

  it('stamps its depth and wraps over the raster\'s edge', () => {
    const n = 64;
    const h = new Float32Array(n * n);
    stampCrater(h, n, { x: 1, y: 62, diameter: 12, dd: 0.1 });
    expect(h.reduce((a, b) => Math.min(a, b), 0)).toBeCloseTo(-1.2, 1);
    expect(h[63 * n + 63]).toBeLessThan(0);
    expect(h[1 * n + 1]).toBeLessThan(0);
  });
});

describe('the raster read at two scales', () => {
  const { field, jobs, count } = bakeRelief(7);
  jobs.forEach((j) => j());

  it('bakes in jobs and holds the craters\' count', () => {
    expect(jobs.length).toBeGreaterThan(10);
    expect(count).toBe(craterCount(CRATER_FIELD));
    expect(field.reduce((a, b) => Math.min(a, b), 0)).toBeLessThan(-1);
  });

  it('carries 0.19 to 12 m craters in two scales eight times apart', () => {
    expect(TILE_M[1] / TILE_M[0]).toBe(8);
    expect(SCALE_D_MIN_M[0]).toBeCloseTo(0.1875, 6);
    expect(SCALE_D_MIN_M[1]).toBeCloseTo(1.5, 6);
  });

  it('is continuous, and a weight of 0 drops a scale', () => {
    const a = reliefAt(field, 5, 5);
    expect(Math.abs(reliefAt(field, 5.001, 5) - a)).toBeLessThan(0.01);
    expect(reliefAt(field, 5, 5, [0, 0])).toBe(0);
    const fine = reliefAt(field, 5, 5, [1, 0]);
    const coarse = reliefAt(field, 5, 5, [0, 1]);
    expect(fine + coarse).toBeCloseTo(a, 9);
  });

  it('reads texel centres exactly and wraps', () => {
    const n = CRATER_FIELD.texels;
    expect(readRelief(field, 10.5, 20.5)).toBe(field[20 * n + 10]);
    expect(readRelief(field, 10.5 + n, 20.5 + n)).toBe(field[20 * n + 10]);
  });
});
