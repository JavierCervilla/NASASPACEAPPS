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
 * The measured rock law (VENT-62): Golombek & Rapp (1997) as Bandfield et
 * al. (2011) apply it to the Moon, rocks partly buried, denser where the
 * near ground is steep or convex, produced band by band so the work can be
 * sliced.
 */
import { describe, expect, it } from 'vitest';
import { MEASURED, density, kAt, qOf } from '../src/terrain/rock-law';
import { measuredBands, measuredRocks } from '../src/terrain/rocks-measured';

const FLAT = () => 0;
const slope = (s: number) => (east: number) => s * east;

describe('the law', () => {
  it('has Golombek & Rapp\'s exponent q = 1.79 + 0.152 / k', () => {
    expect(qOf(0.01)).toBeCloseTo(16.99, 6);
    expect(qOf(0.1)).toBeCloseTo(3.31, 6);
  });

  it('puts fewer rocks the larger they are', () => {
    const k = MEASURED.kFlat;
    expect(density(k, 0.1)).toBeGreaterThan(density(k, 0.2));
    expect(density(k, 0.2)).toBeGreaterThan(density(k, 0.6));
  });
});

describe('kAt', () => {
  it('is the flat value on flat ground and the most on a steep slope', () => {
    expect(kAt(FLAT, 0, 0)).toBe(MEASURED.kFlat);
    expect(kAt(slope(0.5), 0, 0)).toBe(MEASURED.kMax);
  });

  it('rises on a crater rim (convex) and between', () => {
    const rim = (e: number, n: number) => -0.01 * (e * e + n * n);
    expect(kAt(rim, 0, 0)).toBeGreaterThan(MEASURED.kFlat);
    const gentle = kAt(slope(0.1), 0, 0);
    expect(gentle).toBeGreaterThan(MEASURED.kFlat);
    expect(gentle).toBeLessThan(MEASURED.kMax);
  });
});

describe('measuredRocks', () => {
  const flat = measuredRocks(7, FLAT);

  it('is the same every time for a seed, another for another', () => {
    expect(measuredRocks(7, FLAT)).toEqual(flat);
    expect(measuredRocks(8, FLAT)).not.toEqual(flat);
  });

  it('keeps every rock between the least and the largest size, under the cap', () => {
    expect(flat.length).toBeGreaterThan(100);
    expect(flat.length).toBeLessThanOrEqual(MEASURED.cap);
    for (const r of flat) {
      expect(r.radius * 2).toBeGreaterThanOrEqual(MEASURED.minD - 1e-9);
      expect(r.radius * 2).toBeLessThanOrEqual(MEASURED.maxD + 1e-9);
    }
  });

  it('buries each rock by 20 to 50 % and leaves none under the eye', () => {
    for (const r of flat) {
      const buried = (1 - (r.lift ?? 1)) / 2;
      expect(buried).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(buried).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(Math.hypot(r.east, r.north)).toBeGreaterThanOrEqual(MEASURED.innerM);
    }
  });

  it('follows the law on flat ground: rocks of 10 cm and more within 26 m', () => {
    const k = MEASURED.kFlat;
    let expected = 0;
    const area = Math.PI * (26 ** 2 - MEASURED.innerM ** 2);
    for (let d = 0.1; d < MEASURED.maxD; d += 0.001) expected += density(k, d) * 0.001 * area;
    const seen = flat.filter((r) => r.radius * 2 >= 0.1 && Math.hypot(r.east, r.north) <= 26).length;
    expect(seen).toBeGreaterThan(expected * 0.8);
    expect(seen).toBeLessThan(expected * 1.2);
  });

  it('puts more rocks on a slope than on the flat (the cap lifted)', () => {
    const open = { ...MEASURED, cap: 5000 };
    const count = (ground: (east: number) => number) => measuredRocks(7, ground, open)
      .filter((r) => r.radius * 2 >= 0.1).length;
    expect(count(slope(0.5))).toBeGreaterThan(2 * count(FLAT));
  });
});

describe('measuredBands', () => {
  it('gives the same rocks as measuredRocks, a band at a time, largest first', () => {
    const bands = measuredBands(7, FLAT);
    expect(bands.count).toBeGreaterThan(3);
    const all = Array.from({ length: bands.count }, (_, i) => bands.band(i)).flat();
    expect(all).toEqual(measuredRocks(7, FLAT));
    const sizes = all.map((r) => r.radius);
    expect(sizes[0]).toBeGreaterThan(sizes[sizes.length - 1]!);
  });

  it('keeps each band to a few hundred rocks, work for a few milliseconds', () => {
    const bands = measuredBands(7, FLAT);
    for (let i = 0; i < bands.count; i++) {
      expect(bands.band(i).length).toBeLessThanOrEqual(MEASURED.cap / 2);
    }
  });
});
