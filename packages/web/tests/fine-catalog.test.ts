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
 * The fine tiles' catalogue (VENT-62): its boxes are those of the shipped
 * `tile.json` files, and a point is inside a tile or it is not.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FINE_SITES, fineSiteAt, planeOf } from '../src/terrain/fine/fine-catalog';

interface TileJson {
  georeference: { upper_left_m: [number, number]; pixel_m: number; width: number; height: number };
  layers: { heights: { offset_m: number; step_m: number; sha256: string } };
}

const json = (folder: string): TileJson => JSON.parse(readFileSync(
  new URL(`../public/fine-tiles/${folder}/tile.json`, import.meta.url), 'utf8'));

describe('the catalogue', () => {
  it('lists the four tiles of Mooner', () => {
    expect(FINE_SITES.map((s) => s.folder).sort()).toEqual(
      ['malapert-a', 'malapert-massif', 'mons-mouton', 'shackleton-ridge']);
  });

  it.each(FINE_SITES.map((s) => [s.folder, s] as const))(
    '%s matches its tile.json', (folder, site) => {
      const t = json(folder);
      expect([site.ulx, site.uly]).toEqual(t.georeference.upper_left_m);
      expect(site.pixelM).toBe(t.georeference.pixel_m);
      expect(site.size).toBe(t.georeference.width);
      expect(site.size).toBe(t.georeference.height);
      expect(site.offsetM).toBe(t.layers.heights.offset_m);
      expect(site.stepM).toBe(t.layers.heights.step_m);
      expect(site.sha256).toBe(t.layers.heights.sha256);
    });
});

describe('fineSiteAt', () => {
  it('finds IM-2 in the NAC tile centred on it', () => {
    expect(fineSiteAt(-84.79, 29.2)?.folder).toBe('mons-mouton');
  });

  it('finds nothing at the other points of the suite', () => {
    expect(fineSiteAt(-85.5, 40)).toBeNull();
    expect(fineSiteAt(-89.5, 0)).toBeNull();
    expect(fineSiteAt(30, 10)).toBeNull();
  });

  it('puts the south pole at the plane\'s origin and 0° E on +Y', () => {
    const [x, y] = planeOf(-90, 0);
    expect(Math.hypot(x, y)).toBeLessThan(1e-6);
    const [x1, y1] = planeOf(-89, 0);
    expect(x1).toBeCloseTo(0, 6);
    expect(y1).toBeGreaterThan(0);
    expect(planeOf(-89, 90)[0]).toBeGreaterThan(0);
  });
});
