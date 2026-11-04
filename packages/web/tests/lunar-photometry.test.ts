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
 * The ground's lunar photometry (VENT-62): lunar-Lambert with a shadow-hiding
 * opposition surge, calibrated on the Apollo Hasselblad frames of
 * `calibration.md` (VENT-62's artifacts): the ground by the antisolar point
 * is 1.34 to 1.64 times the ground beside it, and the ground toward the
 * Sun 0.4 to 0.7 of the ground away from it.
 */
import { describe, expect, it } from 'vitest';
import {
  APOLLO_HALO,
  L_FLOOR,
  LUNAR_NORM,
  groundReflectance,
  lunarL,
  opposition,
} from '../src/terrain/lunar-photometry';
import { phaseAngleDeg, sunUpGeometry } from '../src/terrain/lunar-geometry';

const RAD = Math.PI / 180;

describe('lunar-Lambert (McEwen 1991, as USGS ISIS LunarLambertMcEwen)', () => {
  it('is 1 at zero phase and follows the cubic of ISIS', () => {
    expect(lunarL(0)).toBe(1);
    expect(lunarL(30)).toBeCloseTo(1 - 0.019 * 30 + 0.000242 * 900
      - 0.00000146 * 27000, 12);
  });

  it('is held between its floor and 1 past the fit (ISIS fits to 120°)', () => {
    for (const a of [0, 30, 90, 120, 150, 180]) {
      expect(lunarL(a)).toBeGreaterThanOrEqual(L_FLOOR);
      expect(lunarL(a)).toBeLessThanOrEqual(1);
    }
  });

  it('equals Lambert (cos i) at i = 30°, e = 0°, phase 30°', () => {
    const r = groundReflectance(Math.cos(30 * RAD), 1, 30);
    // The opposition is 1 at its normalising phase of 30°.
    expect(r).toBeCloseTo(Math.cos(30 * RAD), 9);
    expect(LUNAR_NORM).toBeGreaterThan(0);
  });

  it('is zero when the Sun is under the surface', () => {
    expect(groundReflectance(0, 0.5, 60)).toBe(0);
  });
});

describe('the opposition surge', () => {
  it('is largest at zero phase and falls monotonically', () => {
    let last = Infinity;
    for (const a of [0, 1, 3, 10, 30, 90, 179]) {
      const b = opposition(a);
      expect(b).toBeLessThanOrEqual(last);
      last = b;
    }
  });

  it('is 1 when the phase is 30° (the normalisation)', () => {
    expect(opposition(30)).toBeCloseTo(1, 12);
  });
});

describe('against the Apollo frames', () => {
  const flat = (sunElDeg: number, viewElDeg: number, azDeg: number) => {
    const { mu0, mu, alphaDeg } = sunUpGeometry(sunElDeg, viewElDeg, azDeg);
    return groundReflectance(mu0, mu, alphaDeg);
  };
  const SUN_DEG = [8.4, 17, 20.7];
  /**
   * The camera's shadow lies where the eye looks along the Sun's rays: the
   * ground there is seen as high as the Sun is, and the ground of the same
   * rows beside it 10 to 16° of azimuth away (the boxes of
   * measurement-boxes.json, 0.024° a pixel).
   */
  it('brightens the ground by the antisolar point 1.34 to 1.64 times', () => {
    for (const sun of SUN_DEG) {
      for (const beside of [10, 13, 16]) {
        const ratio = flat(sun, sun, 0) / flat(sun, sun, beside);
        expect(ratio).toBeGreaterThanOrEqual(APOLLO_HALO.min);
        expect(ratio).toBeLessThanOrEqual(APOLLO_HALO.max);
      }
    }
  });

  it('darkens the ground toward the Sun below the ground away from it', () => {
    // The Sun's own term only: the fill adds its share on top, and the
    // frame's ratio of 0.4 to 0.7 (e2e/terrain-view) is measured on the
    // drawn ground, fill included.
    for (const sun of SUN_DEG) {
      for (const view of [4.6, 9.1, sun]) {
        const ratio = flat(sun, view, 180) / flat(sun, view, 0);
        expect(ratio).toBeLessThan(0.7);
      }
    }
  });

  it('reads the phase angle between the Sun and the eye', () => {
    expect(phaseAngleDeg(8, 8, 0)).toBeCloseTo(0, 6);
    expect(phaseAngleDeg(8, 8, 180)).toBeCloseTo(164, 6);
  });
});
