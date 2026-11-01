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
import type { DemGrid } from '../src/dem-grid.ts';
import { arrayGrid, pixelOf } from '../src/dem-grid.ts';
import { unitVector } from '../src/horizon.ts';
import { terrainHorizon, type DemBand } from '../src/ray-march.ts';
import { horizonAt } from '../src/terrain-profile.ts';

const R = 1_737_400;
const SIZE = 400;
const PIXEL_M = 20;
// A synthetic south polar grid: 400 x 400 pixels of 20 m, pole at its centre.
const POLE = (SIZE - 1) / 2;
const OBSERVER = { latDeg: -89.99, lonEastDeg: 30, heightM: 2 };

/** A grid whose height is `heightAt(metres from the observer)`. */
function ringGrid(heightAt: (m: number) => number): DemGrid {
  const meta = {
    id: 'synthetic',
    lines: SIZE,
    samples: SIZE,
    metresPerDn: 0.5,
    radiusM: R,
    projection: {
      kind: 'polar' as const,
      pole: 'south' as const,
      poleLine: POLE,
      poleSample: POLE,
      metresPerPixel: PIXEL_M,
    },
  };
  const probe = arrayGrid(meta, new Int16Array(SIZE * SIZE));
  const [ol, os] = pixelOf(probe, unitVector(OBSERVER.latDeg, 30));
  const dn = Int16Array.from({ length: SIZE * SIZE }, (_, i) => {
    const m = Math.hypot(Math.floor(i / SIZE) - ol, (i % SIZE) - os) * PIXEL_M;
    return Math.round(heightAt(m) / 0.5);
  });
  return arrayGrid(meta, dn);
}

function bands(grid: DemGrid): DemBand[] {
  return [{ untilM: 3_500, stepM: PIXEL_M, grids: [grid] }];
}

describe('terrainHorizon on a smooth sphere', () => {
  it('sees the dip of the curvature, sqrt(2h / R), all round', () => {
    const result = terrainHorizon(bands(ringGrid(() => 0)), OBSERVER);
    const dip = -Math.atan(Math.sqrt((2 * 2) / R)) * (180 / Math.PI);
    for (const az of [0, 90, 181.5, 359.5]) {
      expect(horizonAt(result.profile, az)).toBeCloseTo(dip, 2);
    }
    expect(result.groundM).toBe(0);
    expect(result.coverage).toBe(1);
    expect(result.stopsByGrid).toEqual({ synthetic: 720 * 174 });
  });
});

describe('terrainHorizon in a crater', () => {
  // A 500 m wall 1 km from the observer, all round.
  const grid = ringGrid((m) => (m > 1_000 ? 500 : 0));

  it('sees the wall at atan(height / distance), less a pixel of ramp', () => {
    const result = terrainHorizon(bands(grid), OBSERVER);
    const top = Math.atan(498 / 1_000) * (180 / Math.PI);
    for (const az of [0, 45, 200]) {
      const el = horizonAt(result.profile, az);
      expect(el).toBeLessThanOrEqual(top);
      expect(el).toBeGreaterThan(top - 0.6);
    }
  });

  it('gives the same profile twice, bit for bit', () => {
    const a = terrainHorizon(bands(grid), OBSERVER);
    const b = terrainHorizon(bands(grid), OBSERVER);
    expect(a.profile.centiDeg).toEqual(b.profile.centiDeg);
  });

  it('lowers the wall for a taller observer', () => {
    const low = terrainHorizon(bands(grid), OBSERVER);
    const high = terrainHorizon(bands(grid), { ...OBSERVER, heightM: 16 });
    expect(horizonAt(high.profile, 0)).toBeLessThan(horizonAt(low.profile, 0));
  });
});

describe('terrainHorizon over its bands', () => {
  it('falls to the next grid of a band where the first has no height', () => {
    const hole: DemGrid = { ...ringGrid(() => 0), id: 'hole', dnAt: () => NaN };
    const flat = ringGrid(() => 0);
    const result = terrainHorizon(
      [{ untilM: 3_500, stepM: PIXEL_M, grids: [hole, flat] }],
      OBSERVER,
    );
    expect(result.stopsByGrid).toEqual({ synthetic: 720 * 174 });
  });

  it('refuses a point no grid of the first band covers', () => {
    const away = { ...OBSERVER, latDeg: -80 };
    expect(() => terrainHorizon(bands(ringGrid(() => 0)), away)).toThrow(
      RangeError,
    );
  });
});

describe('terrainHorizon on a simple cylindrical grid', () => {
  // 1516 px per degree is about 20 m; the grid spans 0.13° around 0° N 10° E.
  const ppd = 1516;
  const meta = {
    id: 'cyl',
    lines: SIZE,
    samples: SIZE,
    metresPerDn: 0.5,
    radiusM: R,
    projection: {
      kind: 'cylindrical' as const,
      pixelsPerDeg: ppd,
      lineOffset: POLE,
      sampleOffset: POLE + (180 - 10) * ppd,
      centerLonDeg: 180,
    },
  };
  const pxM = (R * Math.PI) / 180 / ppd;
  const dn = Int16Array.from({ length: SIZE * SIZE }, (_, i) => {
    const m = Math.hypot(Math.floor(i / SIZE) - POLE, (i % SIZE) - POLE) * pxM;
    return m > 1_000 ? 1_000 : 0;
  });

  it('maps lat/lon as the label says and sees the same crater', () => {
    const grid = arrayGrid(meta, dn);
    const [line, sample] = pixelOf(grid, unitVector(0, 10));
    expect(line).toBeCloseTo(POLE, 6);
    expect(sample).toBeCloseTo(POLE, 6);
    const observer = { latDeg: 0, lonEastDeg: 10, heightM: 2 };
    const result = terrainHorizon(bands(grid), observer);
    const top = Math.atan(498 / 1_000) * (180 / Math.PI);
    expect(horizonAt(result.profile, 90)).toBeGreaterThan(top - 0.6);
    expect(horizonAt(result.profile, 90)).toBeLessThanOrEqual(top);
  });
});

describe('pixelOf on a polar grid, as the PDS labels place it', () => {
  // LOLA polar labels: radius r = 2R tan(45° - |lat| / 2) from the pole.
  // South (LDEM_80S_*): 0° E is up (line falls), 90° E right (sample rises).
  // North (LDEM_80N_*): 0° E is down (line rises), 90° E right.
  const MPP = 20;
  const r = (lat: number): number =>
    (2 * R * Math.tan(((45 - Math.abs(lat) / 2) * Math.PI) / 180)) / MPP;
  function polar(pole: 'south' | 'north'): DemGrid {
    const meta = {
      id: pole,
      lines: SIZE,
      samples: SIZE,
      metresPerDn: 0.5,
      radiusM: R,
      projection: {
        kind: 'polar' as const,
        pole,
        poleLine: POLE,
        poleSample: POLE,
        metresPerPixel: MPP,
      },
    };
    return arrayGrid(meta, new Int16Array(SIZE * SIZE));
  }

  it('south: 0° E above the pole, 90° E to its right', () => {
    const grid = polar('south');
    const [l0, s0] = pixelOf(grid, unitVector(-89.9, 0));
    expect(l0).toBeCloseTo(POLE - r(-89.9), 6);
    expect(s0).toBeCloseTo(POLE, 6);
    const [l90, s90] = pixelOf(grid, unitVector(-89.9, 90));
    expect(l90).toBeCloseTo(POLE, 6);
    expect(s90).toBeCloseTo(POLE + r(-89.9), 6);
  });

  it('north: 0° E below the pole, 90° E to its right', () => {
    const grid = polar('north');
    const [l0, s0] = pixelOf(grid, unitVector(89.9, 0));
    expect(l0).toBeCloseTo(POLE + r(89.9), 6);
    expect(s0).toBeCloseTo(POLE, 6);
    const [l90, s90] = pixelOf(grid, unitVector(89.9, 90));
    expect(l90).toBeCloseTo(POLE, 6);
    expect(s90).toBeCloseTo(POLE + r(89.9), 6);
  });
});
