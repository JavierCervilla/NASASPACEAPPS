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

/** The polar map's projection (lib/polar-projection.ts) and the tabs that switch to it (lib/view-tabs.ts). */
import { describe, expect, it } from 'vitest';
import { fromPolarMap, onPolarMap, RIM_LAT_DEG, toPolarMap } from '../src/lib/polar-projection';
import { markCurrentTab, VIEW_HASH, viewOfHash } from '../src/lib/view-tabs';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

describe('south polar stereographic projection', () => {
  it('puts the pole at the centre and 80° S on the rim', () => {
    const pole = toPolarMap({ lat: -90, lonEast: 123 });
    close(Math.hypot(pole.x, pole.y), 0);
    for (const lonEast of [0, 45, 90, 180, -90]) {
      const rim = toPolarMap({ lat: RIM_LAT_DEG, lonEast });
      close(Math.hypot(rim.x, rim.y), 1);
    }
  });

  it('draws 0° at the top, 90° E on the right, 180° at the bottom and 90° W on the left', () => {
    const at = (lonEast: number) => toPolarMap({ lat: -85, lonEast });
    expect(at(0).y).toBeLessThan(0);
    close(at(0).x, 0);
    expect(at(90).x).toBeGreaterThan(0);
    close(at(90).y, 0);
    expect(at(180).y).toBeGreaterThan(0);
    expect(at(-90).x).toBeLessThan(0);
  });

  it('places IM-2 where the validated canvas does (62.7 %, 27.3 %)', () => {
    const { x, y } = toPolarMap({ lat: -84.7906, lonEast: 29.1957 });
    expect(50 + 50 * x).toBeCloseTo(62.7, 1);
    expect(50 + 50 * y).toBeCloseTo(27.3, 1);
  });

  it('grows the radius as tan(colatitude / 2): 85° S sits just inside half the radius', () => {
    const { y } = toPolarMap({ lat: -85, lonEast: 0 });
    close(-y, Math.tan((2.5 * Math.PI) / 180) / Math.tan((5 * Math.PI) / 180));
  });

  it('round-trips points of the map', () => {
    for (const point of [
      { lat: -80, lonEast: 0 },
      { lat: -84.7906, lonEast: 29.1957 },
      { lat: -89.684, lonEast: -163.261 },
      { lat: -87.45, lonEast: -5.17 },
      { lat: -82.2587, lonEast: 179.5 },
    ]) {
      const back = fromPolarMap(toPolarMap(point));
      close(back.lat, point.lat);
      close(back.lonEast, point.lonEast);
    }
  });

  it('round-trips points of the disk the other way', () => {
    for (const at of [{ x: 0.3, y: -0.4 }, { x: -0.9, y: 0.1 }, { x: 0, y: 1 }]) {
      const back = toPolarMap(fromPolarMap(at));
      close(back.x, at.x);
      close(back.y, at.y);
    }
  });

  it('holds only latitudes from 80° S to the pole', () => {
    expect(onPolarMap(-80)).toBe(true);
    expect(onPolarMap(-90)).toBe(true);
    expect(onPolarMap(-79.99)).toBe(false);
    expect(onPolarMap(0.67)).toBe(false);
    expect(onPolarMap(Number.NaN)).toBe(false);
  });
});

describe('view tabs', () => {
  it('reads the polar map from its hash and the globe from anything else', () => {
    expect(viewOfHash(VIEW_HASH.polar)).toBe('polar');
    expect(viewOfHash(VIEW_HASH.globe)).toBe('globe');
    expect(viewOfHash('')).toBe('globe');
    expect(viewOfHash('#nonsense')).toBe('globe');
  });

  it('marks only the chosen tab as the current page', () => {
    const attrs = new Map<string, Map<string, string>>();
    const link = (view: string) => {
      const own = new Map<string, string>();
      attrs.set(view, own);
      return {
        dataset: { view },
        setAttribute: (name: string, value: string) => own.set(name, value),
        removeAttribute: (name: string) => own.delete(name),
      };
    };
    const links = [link('globe'), link('polar')];
    const nav = { querySelectorAll: () => links } as unknown as ParentNode;
    markCurrentTab(nav, 'polar');
    expect(attrs.get('polar')?.get('aria-current')).toBe('page');
    expect(attrs.get('globe')?.has('aria-current')).toBe(false);
    markCurrentTab(nav, 'globe');
    expect(attrs.get('globe')?.get('aria-current')).toBe('page');
    expect(attrs.get('polar')?.has('aria-current')).toBe(false);
  });
});
