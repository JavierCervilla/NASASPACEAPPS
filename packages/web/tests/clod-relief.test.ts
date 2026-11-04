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
 * The clod height field (VENT-67): its law (our calibration, no published
 * one), its slow density noise, and the bake in jobs.
 */
import { describe, expect, it } from 'vitest';
import {
  CLOD_LAW,
  CLOD_TEXELS,
  CLOD_TEXEL_M,
  CLOD_TILE_M,
  clodLumps,
  densityNoise,
  keep,
  lawC,
  noiseGrid,
} from '../src/terrain/clod-law';
import { CLOD_HMAX, CLOD_PIT, SLOPE_RANGE } from '../src/terrain/clod-pack';
import { bakeClods } from '../src/terrain/clod-relief';

describe('the clod law', () => {
  it('spans 3 to 30 mm with N(>d) ~ d^-2.2', () => {
    expect(CLOD_LAW.dMin).toBe(0.003);
    expect(CLOD_LAW.dMax).toBe(0.03);
    expect(CLOD_LAW.b).toBe(2.2);
    expect(lawC()).toBeGreaterThan(0);
  });

  it('draws sizes in range, the small far more than the large', () => {
    const lumps = clodLumps(5, noiseGrid(5));
    const d = lumps.map((l) => l.r * 2 * CLOD_TEXEL_M);
    expect(Math.min(...d)).toBeGreaterThanOrEqual(CLOD_LAW.dMin * 0.999);
    expect(Math.max(...d)).toBeLessThanOrEqual(CLOD_LAW.dMax * 1.001);
    const over = (x: number): number => d.filter((v) => v > x).length;
    expect(over(0.006) / over(0.012)).toBeGreaterThan(3);
    expect(lumps[0]!.r).toBeGreaterThanOrEqual(lumps[lumps.length - 1]!.r);
  });

  it('is the same for a seed and another for another', () => {
    expect(clodLumps(1, noiseGrid(1))).toEqual(clodLumps(1, noiseGrid(1)));
    expect(clodLumps(2, noiseGrid(2))).not.toEqual(clodLumps(1, noiseGrid(1)));
  });

  it('keeps the mean cover though dust patches thin the lumps', () => {
    const grid = noiseGrid(9);
    const area = Math.PI * clodLumps(9, grid).reduce((a, l) => a + l.r * l.r, 0);
    const cover = area / (CLOD_TEXELS * CLOD_TEXELS);
    expect(cover).toBeGreaterThan(CLOD_LAW.cover * 0.7);
    expect(cover).toBeLessThan(CLOD_LAW.cover * 1.4);
  });

  it('alternates dust and clusters: density varies across the tile', () => {
    const grid = noiseGrid(4);
    const lumps = clodLumps(4, grid);
    const cell = CLOD_TEXELS / 4;
    const counts = Array.from({ length: 16 }, (_, i) => lumps.filter((l) =>
      Math.floor(l.x / cell) === i % 4 && Math.floor(l.y / cell) === Math.floor(i / 4)).length);
    expect(Math.max(...counts)).toBeGreaterThan(2 * Math.min(...counts));
    expect(keep(0)).toBeLessThan(0.2);
    expect(keep(1)).toBe(1);
  });

  it('has a noise that wraps and stays in 0 to 1', () => {
    const grid = noiseGrid(3);
    expect(densityNoise(grid, 10, 20)).toBeCloseTo(densityNoise(grid, 10 + CLOD_TEXELS, 20), 6);
    for (let x = 0; x < CLOD_TEXELS; x += 97) {
      const v = densityNoise(grid, x, 3 * x % CLOD_TEXELS);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('the clod bake', () => {
  const { h, out, jobs, lumps } = bakeClods(7);
  jobs.forEach((job) => job());

  it('runs in many jobs, each a few milliseconds of work', () => {
    expect(jobs.length).toBeGreaterThan(20);
    expect(lumps).toBeGreaterThan(2000);
  });

  it('piles clods 3 to 12 mm high over a matrix, within the packed range', () => {
    const top = h.reduce((a, b) => Math.max(a, b), 0);
    const low = h.reduce((a, b) => Math.min(a, b), 0);
    expect(top).toBeGreaterThan(0.008);
    expect(top).toBeLessThan(CLOD_HMAX - CLOD_PIT);
    expect(low).toBeGreaterThan(-CLOD_PIT);
  });

  it('covers about the law\'s share of the tile', () => {
    const covered = h.filter((v) => v > 0.0015).length / h.length;
    expect(covered).toBeGreaterThan(0.05);
    expect(covered).toBeLessThan(0.3);
  });

  it('packs height in B and slope in R and G, opaque', () => {
    const at = 300 * CLOD_TEXELS + 400;
    const height = (out[at * 4 + 2]! / 255) * CLOD_HMAX - CLOD_PIT;
    expect(height).toBeCloseTo(h[at]!, 3);
    expect(out[at * 4 + 3]).toBe(255);
    let steep = 0;
    for (let i = 0; i < out.length; i += 4) {
      steep = Math.max(steep, Math.abs(out[i]! / 255 - 0.5) * 2 * SLOPE_RANGE);
    }
    expect(steep).toBeGreaterThan(0.5);
    expect(CLOD_TILE_M).toBe(0.8);
  });
});
