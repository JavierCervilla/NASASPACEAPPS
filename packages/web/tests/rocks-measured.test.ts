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
import { K_FITTED_MIN, MEASURED, density, kAt, qOf } from '../src/terrain/rock-law';
import { groundPolicy } from '../src/terrain/ground-policy';
import { measuredBands, measuredRocks } from '../src/terrain/rocks-measured';

const FLAT = () => 0;
const slope = (s: number) => (east: number) => s * east;

describe('the law', () => {
  it('has Golombek & Rapp\'s exponent q = 1.79 + 0.152 / k (eq. 12, p. 4126)', () => {
    expect(qOf(0.02)).toBeCloseTo(9.39, 6);
    expect(qOf(0.1)).toBeCloseTo(3.31, 6);
    expect(qOf(0.3)).toBeCloseTo(1.79 + 0.152 / 0.3, 6);
  });

  it('holds q at q(0.02) below the fitted range, so a low k only lowers the cover', () => {
    expect(qOf(0.004)).toBe(qOf(K_FITTED_MIN));
    expect(qOf(0.001)).toBe(qOf(K_FITTED_MIN));
    for (const d of [0.1, 0.3, 0.8]) {
      expect(density(0.004, d)).toBeLessThan(density(0.02, d));
      expect(density(0.004, d) / density(0.02, d)).toBeCloseTo(0.004 / 0.02, 9);
    }
  });

  it('takes the plains\' k from Diviner\'s median of 0.003, a little over', () => {
    expect(MEASURED.kFlat).toBeGreaterThanOrEqual(0.003);
    expect(MEASURED.kFlat).toBeLessThanOrEqual(0.005);
    expect(MEASURED.kMax).toBe(0.05);
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

/**
 * VENT-68 changed the rock law at high only: medium keeps the law main had
 * (kFlat 0.01, q never held). These are the rocks that law gave, measured on
 * main (4a14e48) at cap 420: a count, a checksum over every field and the
 * first rock, for two grounds and three seeds.
 */
describe('the rocks of medium and low', () => {
  const sloped = (e: number, n: number): number => 0.3 * e + 0.2 * Math.sin(n / 5);
  const checksum = (rocks: ReturnType<typeof measuredRocks>): number =>
    rocks.reduce((a, k) => a + k.east * 1.1 + k.north * 1.3 + k.radius * 7 + k.squash * 3 + k.yawRad + (k.lift ?? 0) * 5, 0);
  const MAIN = [
    ['flat', 7, 2607.86507646837, -92.6089984624675, 0.20148716159746982],
    ['flat', 8, 4540.1354061815, 89.58723420762959, 0.20516311726300046],
    ['flat', 1234, 2728.95545202793, -32.592584171346935, 0.24902444928186013],
    ['slope', 7, 5364.63236534558, -33.837411558793384, 0.4452024862228427],
    ['slope', 8, 5855.34565525921, -77.40125675352935, 0.4471556027652696],
    ['slope', 1234, 3936.91993637158, 35.09920481981781, 0.44503398531698624],
  ] as const;

  for (const tier of ['medium', 'low'] as const) {
    it.each(MAIN)(`at ${tier} the %s ground, seed %i, gives main's rocks`, (ground, seed, sum, east, radius) => {
      const law = { ...groundPolicy(tier, new Set()).rockLaw, cap: 420 };
      const rocks = measuredRocks(seed, ground === 'flat' ? FLAT : sloped, law);
      expect(rocks).toHaveLength(420);
      expect(checksum(rocks)).toBeCloseTo(sum, 9);
      expect(rocks[0]?.east).toBeCloseTo(east, 9);
      expect(rocks[0]?.radius).toBeCloseTo(radius, 12);
    });
  }

  it('is not what high draws', () => {
    const high = groundPolicy('high', new Set()).rockLaw;
    expect(checksum(measuredRocks(7, FLAT, { ...high, cap: 420 }))).not.toBeCloseTo(2607.86507646837, 3);
  });
});
