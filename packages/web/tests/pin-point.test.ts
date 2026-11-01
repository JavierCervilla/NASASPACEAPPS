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

import { describe, expect, it, vi } from 'vitest';
import { customId, customPointOf, snapPoint } from '../src/pin/custom-point';
import { customSite, formatKm } from '../src/pin/custom-site';
import { greatCircleKm, MOON_RADIUS_KM, nearestSite } from '../src/pin/nearest-site';
import { pointFromSearch, searchWithPoint } from '../src/pin/point-param';
import { pointHoursUrl } from '../src/pin/point-hours';
import { selectedSite } from '../src/pin/selected-site';
import { pointLine } from '../src/card/site-facts';
import { siteLabels, type PhoneSite } from '../src/phone/phone-site';
import { loadSiteHours } from '../src/phone/site-hours';
import { pointsOf } from '../src/source/computed-hours';
import { EN } from './i18n-factories';

const site = (id: string, name: string, lat: number, lonEast: number): PhoneSite => ({
  id,
  name,
  mission: id,
  group: 'south_pole',
  lat,
  lonEast,
  approximate: false,
});

const SITES = [
  site('im2-athena', 'Mons Mouton (IM-2 Athena)', -84.7906, 29.1957),
  site('griffin1-nobile', 'Nobile region near Mons Mouton (Griffin-1, FLIP rover)', -85.2752, 32.5),
  site('artemis-nobile-rim-1', 'Nobile Rim 1 (Artemis candidate region)', -85.2752, 32.5),
  site('apollo11', 'Mare Tranquillitatis (Apollo 11)', 0.67416, 23.47314),
];

describe('custom point id', () => {
  it('snaps to the server grid, clamps the latitude and wraps the longitude', () => {
    expect(snapPoint({ lat: -85.87449, lonEast: 61.335 })).toEqual({ lat: -85.87, lonEast: 61.34 });
    expect(snapPoint({ lat: -95, lonEast: 200 })).toEqual({ lat: -90, lonEast: -160 });
    expect(snapPoint({ lat: 0.001, lonEast: -180 })).toEqual({ lat: 0, lonEast: 180 });
    expect(snapPoint({ lat: Number.NaN, lonEast: 0 })).toBeNull();
  });

  it('round-trips a point through its id, and reads no other id as one', () => {
    const id = customId({ lat: -85.874, lonEast: 61.339 });
    expect(id).toBe('@-85.87,61.34');
    expect(customPointOf(id)).toEqual({ lat: -85.87, lonEast: 61.34 });
    expect(customPointOf('im2-athena')).toBeNull();
    expect(customPointOf('@1,2,3')).toBeNull();
    expect(customPointOf('@-85.87,61.341')).toBeNull();
  });
});

describe('?lat&lon', () => {
  it('reads two plain decimals, snapped to the grid', () => {
    expect(pointFromSearch('?lat=-85.874&lon=61.339')).toEqual({ lat: -85.87, lonEast: 61.34 });
    expect(pointFromSearch('?lat=%2B12.5&lon=-180')).toEqual({ lat: 12.5, lonEast: 180 });
  });

  it('takes east longitudes up to 360°, as the API does, wrapped to ±180°', () => {
    expect(pointFromSearch('?lat=-85&lon=300')).toEqual({ lat: -85, lonEast: -60 });
    expect(pointFromSearch('?lat=-85&lon=360')).toEqual({ lat: -85, lonEast: 0 });
  });

  it('ignores a value out of range instead of clamping or wrapping it', () => {
    for (const search of ['?lat=-200&lon=10', '?lat=90.01&lon=10', '?lat=-85&lon=999', '?lat=-85&lon=-180.5', '?lat=-85&lon=360.01']) {
      expect(pointFromSearch(search)).toBeNull();
    }
    expect(pointFromSearch('?lat=-90&lon=0')).toEqual({ lat: -90, lonEast: 0 });
  });

  it('reads only plain decimals: no hex, exponent, binary or bare dot', () => {
    for (const search of ['?lat=0x10&lon=3', '?lat=1e1&lon=3', '?lat=0b11&lon=3', '?lat=.5&lon=3', '?lat=5.&lon=3', '?lat=-85&lon=1_0', '?lat=--5&lon=3', '?lat=-85&lon= 3']) {
      expect(pointFromSearch(search)).toBeNull();
    }
  });

  it('ignores a missing, empty, non-numeric or overlong value', () => {
    for (const search of ['?lat=-85', '?lat=&lon=3', '?lat=x&lon=3', '?lat=Infinity&lon=3', `?lat=-85&lon=${'1'.repeat(30)}`]) {
      expect(pointFromSearch(search)).toBeNull();
    }
  });

  it('writes the point beside ?site=, and takes it out again', () => {
    const search = searchWithPoint('?site=apollo11', { lat: -85.87, lonEast: 61.3 });
    expect(search).toBe('?site=apollo11&lat=-85.87&lon=61.30');
    expect(searchWithPoint(search, null)).toBe('?site=apollo11');
    expect(searchWithPoint('?lat=1&lon=2', null)).toBe('');
  });
});

describe('nearest site', () => {
  it('measures great circles on the Moon', () => {
    expect(greatCircleKm({ lat: 0, lonEast: 0 }, { lat: 0, lonEast: 90 })).toBeCloseTo((Math.PI / 2) * MOON_RADIUS_KM, 6);
    expect(greatCircleKm({ lat: -90, lonEast: 0 }, { lat: -90, lonEast: 120 })).toBeCloseTo(0, 9);
  });

  it('breaks a tie by the shortest name only against the true nearest, never chaining further away', () => {
    // Each site is 0.4 km further than the one before (0.012° of latitude ≈ 0.36 km): within 0.5 km of its neighbour,
    // but the last is 0.8 km from the nearest, so its shorter name must not win.
    const chain = [
      site('a', 'Nearest of all sites', -85, 0),
      site('b', 'Second site name', -85.013, 0),
      site('c', 'Far', -85.026, 0),
    ];
    const near = nearestSite({ lat: -85, lonEast: 0 }, chain);
    expect(near?.site.id).toBe('b');
    expect(near?.km).toBeCloseTo(greatCircleKm({ lat: -85, lonEast: 0 }, chain[1]!), 9);
    const sameButLonger = [site('x', 'Short', -85.013, 0), site('y', 'A much longer name', -85, 0)];
    expect(nearestSite({ lat: -85, lonEast: 0 }, sameButLonger)?.site.id).toBe('x');
  });

  it('picks the closest site, and of sites sharing a point the shortest name', () => {
    const near = nearestSite({ lat: -85.87, lonEast: 61.34 }, SITES);
    expect(near?.site.id).toBe('artemis-nobile-rim-1');
    expect(near?.km).toBeGreaterThan(20);
    expect(near?.km).toBeLessThan(80);
  });
});

describe('the custom point as a site', () => {
  const point = { lat: -85.87, lonEast: 61.34 };
  const custom = customSite(point, SITES, EN);

  it('is «Custom point», near the closest listed site, with the distance', () => {
    expect(custom.id).toBe('@-85.87,61.34');
    expect(siteLabels(custom)).toEqual({
      title: 'Custom point',
      subtitle: `Near Nobile Rim 1 · ${formatKm(EN, nearestSite(point, SITES)?.km ?? 0)}`,
      pill: 'Custom point',
      pillDetail: '',
    });
    expect(pointLine(EN, custom)).toEqual({ coords: '85.87° S, 61.34° E', note: 'pinned here' });
  });

  it('has no «Near» subtitle when no listed site has coordinates', () => {
    const alone = customSite(point, [], EN);
    expect(alone.custom).toEqual({ near: '', distance: '' });
    expect(siteLabels(alone).subtitle).toBe('');
  });

  it('writes short distances with one decimal', () => {
    expect(formatKm(EN, 3.44)).toBe('3.4 km');
    expect(formatKm(EN, 268.4)).toBe('268 km');
  });

  it('is what a custom id selects; a listed id selects its site', () => {
    expect(selectedSite(SITES, custom.id, EN)).toMatchObject({ name: 'Custom point', lat: -85.87 });
    expect(selectedSite(SITES, 'apollo11', EN)).toBe(SITES[3]);
    expect(selectedSite(SITES, 'mystery', EN)).toMatchObject({ name: 'mystery' });
  });

  it('has computed hours at its point', () => {
    expect(pointsOf(SITES)(custom.id)).toEqual({ latDeg: -85.87, lonEastDeg: 61.34 });
  });
});

describe('the custom point from the API', () => {
  const range = { from: '2026-11-01T00:00:00Z', to: '2026-12-01T23:00:00Z' };

  it('asks the route for any point, on the grid', () => {
    const url = new URL(pointHoursUrl('/api/v1/sites', { lat: -85.87, lonEast: 61.3 }, range), 'https://x.test');
    expect(url.pathname).toBe('/api/v1/ephemeris');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: '-85.87', lon: '61.30', from: range.from, to: range.to, at: range.from,
    });
  });

  it('reads that route’s unwrapped ephemeris', async () => {
    const hour = { t: range.from, sunEl: 1, sunAz: 2, earthEl: 3, earthAz: 4, dsn: null };
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ lat: -85.87, hours: [hour] }));
    const hours = await loadSiteHours({ fetch, sitesUrl: '/api/v1/sites' }, '@-85.87,61.30', range);
    expect(hours).toEqual([hour]);
    expect(String(fetch.mock.calls[0]?.[0])).toContain('/api/v1/ephemeris?lat=-85.87&lon=61.30');
  });
});
