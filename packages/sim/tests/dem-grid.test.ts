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
 * The 0°/360° seam of a global simple cylindrical grid (VENT-44): LDEM_128
 * and the LDEM_256/512 mosaics put their first pixel centre half a pixel
 * east of 0° E and their last half a pixel west of 360° E, so the strip
 * between them is covered only by wrapping across the seam.
 */
import { describe, expect, it } from 'vitest';
import { arrayGrid, demHeightAt, pixelOf } from '../src/dem-grid.ts';
import { unitVector } from '../src/horizon.ts';
import { terrainHorizon } from '../src/ray-march.ts';

const R = 1_737_400;
/** Pixels per degree of the synthetic globe: 360 x 180 pixels of 1°. */
const PPD = 1;
const SAMPLES = 360 * PPD;
const LINES = 180 * PPD;

/** A grid whose DN is its sample's number, as the labels place it. */
function cylindrical(samples: number, sampleOffset: number) {
  const meta = {
    id: 'globe',
    lines: LINES,
    samples,
    metresPerDn: 1,
    radiusM: R,
    projection: {
      kind: 'cylindrical' as const,
      pixelsPerDeg: PPD,
      lineOffset: 90 * PPD - 0.5,
      sampleOffset,
      centerLonDeg: 180,
    },
  };
  const dn = Int16Array.from({ length: LINES * samples }, (_, i) => i % samples);
  return arrayGrid(meta, dn);
}

const globe = cylindrical(SAMPLES, 180 * PPD - 0.5);
/** Mean of the last column (DN 359) and the first (DN 0). */
const SEAM_MEAN = (SAMPLES - 1) / 2;

describe('demHeightAt across the seam of a global grid', () => {
  it('puts 0° E half a pixel before the first pixel centre', () => {
    expect(pixelOf(globe, unitVector(0, 0))[1]).toBeCloseTo(-0.5, 9);
  });

  it('reads 0° E between the last and first columns', () => {
    for (const lat of [0, 0.5, 60, -60]) {
      expect(demHeightAt(globe, unitVector(lat, 0))).toBeCloseTo(SEAM_MEAN, 9);
    }
  });

  it('wraps on either side of the seam, weighted by distance', () => {
    const west = demHeightAt(globe, unitVector(10, 359.75));
    expect(west).toBeCloseTo(359 * 0.75 + 0 * 0.25, 9);
    const east = demHeightAt(globe, unitVector(10, 0.25));
    expect(east).toBeCloseTo(359 * 0.25 + 0 * 0.75, 9);
  });

  it('keeps the bounds of a grid that spans less than 360°', () => {
    // A tile of 180°, from 0° E to 180° E: its west edge is no seam.
    const tile = cylindrical(SAMPLES / 2, 180 * PPD - 0.5);
    expect(demHeightAt(tile, unitVector(10, 0))).toBeNaN();
    expect(demHeightAt(tile, unitVector(10, 90))).toBeCloseTo(89.5, 9);
  });
});

describe('terrainHorizon at the seam of a global grid', () => {
  it('answers at 0° E with every stop covered', () => {
    for (const latDeg of [0, 0.5, 60]) {
      const observer = { latDeg, lonEastDeg: 0, heightM: 2 };
      const bands = [{ untilM: 200_000, stepM: 2_000, grids: [globe] }];
      const result = terrainHorizon(bands, observer);
      expect(result.groundM).toBeCloseTo(SEAM_MEAN, 6);
      expect(result.coverage).toBe(1);
    }
  });
});

describe('terrainHorizon near the seam of a global grid', () => {
  it('keeps the stops of the rays that cross it', () => {
    const observer = { latDeg: 20, lonEastDeg: 3, heightM: 2 };
    const bands = [{ untilM: 200_000, stepM: 2_000, grids: [globe] }];
    expect(terrainHorizon(bands, observer).coverage).toBe(1);
  });
});
