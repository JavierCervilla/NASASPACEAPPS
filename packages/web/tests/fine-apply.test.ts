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
 * Putting the fine relief on ring level 0 (VENT-62): its nodes inside the
 * tile take the NAC heights, weighted by the feather, with the vertical
 * offset against LOLA that the first covered tile measures.
 */
import { describe, expect, it } from 'vitest';
import type { RingTile } from '../src/terrain/ring/ring-store';
import { FINE_SITES } from '../src/terrain/fine/fine-catalog';
import { applyFine, newOffset } from '../src/terrain/fine/fine-apply';
import type { FineGrid } from '../src/terrain/fine/fine-load';

const SITE = FINE_SITES[0]!;
const N = SITE.size;
/** A ramp of 0.1 m a pixel to the east, 10 m over LOLA's flat 5300. */
const grid = (weight: (c: number, r: number) => number): FineGrid => ({
  site: SITE, size: N,
  heights: Float32Array.from({ length: N * N }, (_, i) => 5310 + 0.1 * ((i % N) - 150)),
  weights: Float32Array.from({ length: N * N }, (_, i) => weight(i % N, Math.floor(i / N))),
});
const tile = (level = 0): RingTile => ({
  key: { scheme: 'polar-south', level, x: 38, y: 69 }, n: 129,
  heights: new Float32Array(129 * 129).fill(5300), resolutionM: 20 });

describe('applyFine', () => {
  it('leaves the tile alone when the fine tile has no weight', () => {
    const t = tile();
    expect(applyFine(t, grid(() => 0), newOffset()).heights).toEqual(t.heights);
  });

  it('shapes level 0 by the fine relief about LOLA\'s mean', () => {
    const t = applyFine(tile(), grid(() => 1), newOffset());
    const inside = [...t.heights].filter((h) => h !== 5300);
    expect(inside.length).toBeGreaterThan(4000);
    const mean = inside.reduce((a, h) => a + h, 0) / inside.length;
    expect(mean).toBeCloseTo(5300, 0);
    expect(Math.max(...inside) - Math.min(...inside)).toBeGreaterThan(10);
  });

  it('does not touch the original tile', () => {
    const t = tile();
    applyFine(t, grid(() => 1), newOffset());
    expect(new Set(t.heights)).toEqual(new Set([5300]));
  });

  it('leaves the other levels and tiles that miss the box as they are', () => {
    const o = newOffset();
    expect(applyFine(tile(1), grid(() => 1), o).heights).toEqual(tile(1).heights);
    const far = { ...tile(), key: { ...tile().key, x: 10, y: 10 } };
    expect(applyFine(far, grid(() => 1), o).heights).toEqual(far.heights);
  });

  it('shows half the relief where the weight is half', () => {
    const o = newOffset();
    const full = applyFine(tile(), grid(() => 1), o);
    const half = applyFine(tile(), grid(() => 0.5), o);
    const i = [...full.heights].findIndex((h) => Math.abs(h - 5300) > 2);
    expect(half.heights[i]! - 5300).toBeCloseTo((full.heights[i]! - 5300) / 2, 2);
  });
});
