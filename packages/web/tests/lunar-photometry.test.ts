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
 * The ground's lunar photometry (VENT-62, VENT-68): Hapke et al. (2012)
 * eq. 12 with its Table 1 at 604 nm, held to the published narrow peak
 * and to the Apollo Hasselblad frames of `calibration.md`: the ground by the
 * antisolar point is 1.34 to 1.64 times the ground beside it, and the ground
 * toward the Sun 0.4 to 0.7 of the ground away from it.
 */
import { describe, expect, it } from 'vitest';
import {
  FLOOR_FROM_DEG,
  APOLLO_HALO,
  LUNAR_NORM,
  floorWeight,
  groundReflectance,
  smoothedPhase,
} from '../src/terrain/lunar-photometry';
import {
  HAPKE,
  hFunction,
  hapkeFactor,
  oppositionTerms,
  phaseFunction,
} from '../src/terrain/hapke';
import { phaseAngleDeg, sunUpGeometry } from '../src/terrain/lunar-geometry';

const RAD = Math.PI / 180;

describe('Hapke et al. (2012), eq. 12 and Table 1 at 604 nm', () => {
  it('carries the published values', () => {
    expect(HAPKE).toMatchObject({ w: 0.357, b: 0.298, bS0: 0.358, bC0: 0.456 });
    // The widths are derived from g_H = 4.68° and say so: ~tan(g_H / 2).
    expect(HAPKE.hS).toBeCloseTo(Math.tan(4.68 * RAD / 2), 2);
  });

  it('has a backscattering lobe, normalised over the sphere', () => {
    expect(phaseFunction(0)).toBeGreaterThan(phaseFunction(90));
    expect(phaseFunction(90)).toBeGreaterThan(phaseFunction(180));
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const g = ((i + 0.5) / n) * Math.PI;
      sum += phaseFunction(g / RAD) * Math.sin(g) * (Math.PI / n);
    }
    expect(sum / 2).toBeCloseTo(1, 3);
  });

  it('has H(x) rising from 1 and growing with x', () => {
    expect(hFunction(1)).toBeGreaterThan(1);
    expect(hFunction(1)).toBeGreaterThan(hFunction(0.2));
    expect(hFunction(0.01)).toBeGreaterThan(1);
    expect(hFunction(0)).toBeCloseTo(hFunction(1e-4), 12);
  });

  it('has both oppositions at their amplitudes at g = 0, falling with it', () => {
    const [zero, five, far] = [0, 5, 60].map(oppositionTerms);
    expect(zero!.bs).toBeCloseTo(HAPKE.bS0, 12);
    expect(zero!.bc).toBeCloseTo(HAPKE.bC0, 12);
    expect(five!.bs).toBeLessThan(zero!.bs);
    expect(far!.bc).toBeLessThan(five!.bc);
  });

  it('is zero when the Sun is under the surface', () => {
    expect(hapkeFactor(0, 0.5, 60)).toBe(0);
    expect(groundReflectance(0, 0.5, 60)).toBe(0);
  });
});

describe('the narrow peak', () => {
  const at = (alphaDeg: number): number =>
    groundReflectance(Math.cos(30 * RAD), 1, alphaDeg);

  it('rises about 30 % from 5° to 0° (Hapke 2012, §13), the Sun\'s disc in', () => {
    expect(at(0) / at(5)).toBeGreaterThan(1.2);
    expect(at(0) / at(5)).toBeLessThan(1.4);
  });

  it('falls monotonically with phase up to the floor', () => {
    let last = Infinity;
    for (const a of [0, 1, 3, 10, 30, 60, 90, 110]) {
      expect(at(a)).toBeLessThan(last);
      last = at(a);
    }
  });

  it('equals Lambert (cos i) at i = 30°, e = 0°, phase 30°, smoothing aside', () => {
    expect(LUNAR_NORM).toBeGreaterThan(0);
    expect(at(30)).toBeCloseTo(Math.cos(30 * RAD), 9);
    expect(smoothedPhase(0)).toBeGreaterThan(0);
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
        expect(ratio).toBeGreaterThan(0.15);
      }
    }
  });

  it('reads the phase angle between the Sun and the eye', () => {
    expect(phaseAngleDeg(8, 8, 0)).toBeCloseTo(0, 6);
    expect(phaseAngleDeg(8, 8, 180)).toBeCloseTo(164, 6);
  });
});

describe('the floor past the model\'s validity', () => {
  it('leaves the model alone up to 120° and takes over by 140°', () => {
    expect(floorWeight(FLOOR_FROM_DEG)).toBe(0);
    expect(floorWeight(90)).toBe(0);
    expect(floorWeight(140)).toBe(1);
    expect(floorWeight(130)).toBeGreaterThan(0);
    expect(floorWeight(130)).toBeLessThan(1);
  });

  it('is continuous across the ramp: no step in the picture', () => {
    let last = groundReflectance(0.3, 0.3, 100);
    for (let a = 101; a <= 179; a++) {
      const now = groundReflectance(0.3, 0.3, a);
      expect(Math.abs(now - last)).toBeLessThan(0.03);
      last = now;
    }
  });
});
