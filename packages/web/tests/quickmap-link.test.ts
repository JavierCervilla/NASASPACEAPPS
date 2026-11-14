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
 * The LROC QuickMap address (VENT-125): the centre in each of QuickMap's
 * three projections against points read off its LAT/LON readout, the
 * switch at ±60°, a wrapped longitude and the 40 x 25 km view.
 */
import { describe, expect, it } from 'vitest';
import {
  projectForQuickmap,
  quickmapUrl,
  wrapLon,
} from '../src/lib/quickmap-link';

const IM2 = { lat: -84.7906, lonEast: 29.1957 };

function centreOf(url: string): [number, number, string] {
  const params = new URL(url).searchParams;
  const [x0, y0, x1, y1] = (params.get('prjExtent') ?? '').split(',');
  const x = (Number(x0) + Number(x1)) / 2;
  const y = (Number(y0) + Number(y1)) / 2;
  return [x, y, params.get('proj') ?? ''];
}

describe('projectForQuickmap', () => {
  it('puts IM-2 on the south polar stereographic (proj 27)', () => {
    const p = projectForQuickmap(IM2);
    expect(p.proj).toBe(27);
    // The readout's «about (77 119, 137 987)» is within 20 m of it.
    expect(Math.abs(p.x - 77119)).toBeLessThan(20);
    expect(Math.abs(p.y - 137987)).toBeLessThan(20);
  });

  it('puts (75° N, 4.588° W) on the north polar one (proj 26)', () => {
    const p = projectForQuickmap({ lat: 75, lonEast: -4.588 });
    expect(p.proj).toBe(26);
    expect(Math.abs(p.x - -36593)).toBeLessThan(1);
    expect(Math.abs(p.y - -456000)).toBeLessThan(1);
  });

  it("puts Chang'e 4 on the equidistant cylindrical (proj 16)", () => {
    const p = projectForQuickmap({ lat: -45.4446, lonEast: 177.5991 });
    expect(p.proj).toBe(16);
    expect(Math.abs(p.x - 5385400)).toBeLessThan(1);
    expect(Math.abs(p.y - -1378033)).toBeLessThan(1);
  });

  it('takes ±60° itself as polar', () => {
    expect(projectForQuickmap({ lat: -60, lonEast: 0 }).proj).toBe(27);
    expect(projectForQuickmap({ lat: 60, lonEast: 0 }).proj).toBe(26);
    expect(projectForQuickmap({ lat: -59.99, lonEast: 0 }).proj).toBe(16);
    expect(projectForQuickmap({ lat: 59.99, lonEast: 0 }).proj).toBe(16);
  });

  it('wraps an east longitude past 180° on the cylindrical map', () => {
    const wrapped = projectForQuickmap({ lat: 10, lonEast: 200 });
    const west = projectForQuickmap({ lat: 10, lonEast: -160 });
    expect(wrapped.x).toBeCloseTo(west.x, 6);
    expect(wrapped.x).toBeLessThan(0);
  });
});

describe('wrapLon', () => {
  it('keeps longitudes in (−180°, 180°]', () => {
    expect(wrapLon(200)).toBeCloseTo(-160, 9);
    expect(wrapLon(180)).toBe(180);
    expect(wrapLon(-180)).toBe(180);
    expect(wrapLon(360)).toBe(0);
    expect(wrapLon(-45)).toBe(-45);
  });
});

describe('quickmapUrl', () => {
  it('opens a 40 x 25 km view in whole metres around the point', () => {
    const url = quickmapUrl(IM2);
    expect(url).toBe(
      'https://quickmap.lroc.im-ldi.com/' +
        '?prjExtent=57108,125493,97108,150493&proj=27',
    );
    const extent = (new URL(url).searchParams.get('prjExtent') ?? '')
      .split(',')
      .map(Number);
    const [x0 = NaN, y0 = NaN, x1 = NaN, y1 = NaN] = extent;
    expect(x1 - x0).toBe(40000);
    expect(y1 - y0).toBe(25000);
    expect(extent.every(Number.isInteger)).toBe(true);
  });

  it('centres the north and the cylindrical views', () => {
    expect(centreOf(quickmapUrl({ lat: 75, lonEast: -4.588 }))).toEqual([
      -36593,
      -456000,
      '26',
    ]);
    const change4 = { lat: -45.4446, lonEast: 177.5991 };
    expect(centreOf(quickmapUrl(change4))).toEqual([
      5385400,
      -1378033,
      '16',
    ]);
  });
});
