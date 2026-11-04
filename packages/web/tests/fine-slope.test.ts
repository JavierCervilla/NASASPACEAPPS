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
 * What the shader needs of a fine tile (VENT-62): its slopes as texels, and
 * where the tile lies in the view's frame.
 */
import { describe, expect, it } from 'vitest';
import { FINE_SITES } from '../src/terrain/fine/fine-catalog';
import type { FineGrid } from '../src/terrain/fine/fine-load';
import { planeAffine, slopeTexels } from '../src/terrain/fine/fine-slope';
import { frameAt } from '../src/terrain/ring/ring-frame';

const SITE = FINE_SITES[0]!;
const N = SITE.size;
const ramp: FineGrid = { site: SITE, size: N,
  heights: Float32Array.from({ length: N * N },
    (_, i) => 0.5 * (i % N) - 0.25 * Math.floor(i / N)),
  weights: new Float32Array(N * N).fill(0.5) };

describe('slopeTexels', () => {
  const t = slopeTexels(ramp);
  const mid = (150 * N + 150) * 4;

  it('encodes dh/dx east as 128 + 127 s in red', () => {
    // 0.5 m a 5 m pixel: slope 0.1.
    expect(t[mid]).toBe(Math.round(128 + 127 * 0.1));
  });

  it('encodes dh/dy north in green (rows run south)', () => {
    // Heights fall 0.25 m a row going south: rising 0.05 to the north.
    expect(t[mid + 1]).toBe(Math.round(128 + 127 * 0.05));
  });

  it('carries the weight in blue and is opaque', () => {
    expect(t[mid + 2]).toBe(128);
    expect(t[mid + 3]).toBe(255);
    expect(t).toHaveLength(N * N * 4);
  });
});

describe('planeAffine', () => {
  const at = (lat: number, lon: number) => planeAffine(frameAt({ lat, lonEast: lon }, 0));

  it('puts the site at its plane position', () => {
    const a = at(-85, 0);
    expect(a.x0).toBeCloseTo(0, 3);
    expect(a.y0).toBeGreaterThan(0);
  });

  it('turns east into +X at 0° E and north away from the pole (+Y)', () => {
    const a = at(-85, 0);
    expect(a.xe).toBeGreaterThan(0.99);
    expect(Math.abs(a.ye)).toBeLessThan(0.01);
    expect(a.yn).toBeGreaterThan(0.99);
  });

  it('is a rotation to within the projection\'s scale at 90° E', () => {
    const a = at(-85, 90);
    expect(a.ye).toBeLessThan(-0.99);
    expect(Math.hypot(a.xe, a.ye)).toBeCloseTo(1, 2);
  });
});
