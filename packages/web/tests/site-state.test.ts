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

import type { HourSample } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { hoursStatus, siteState, stateLine } from '../src/phone/site-state';
import type { HoursResult } from '../src/phone/widgets-loader';
import { thumbOf } from '../src/thumbs/thumbs';

const HOUR = 3_600_000;
const NOV = Date.parse('2026-11-01T00:00:00Z');

/**
 * Two months of hours from 1 November 2026: Sun only for the first 100, a window to 200, Earth only to 300, then
 * neither, so each state holds at a known hour and lasts a known time.
 */
const SKY: HourSample[] = Array.from({ length: 61 * 24 }, (_, hour) => ({
  t: new Date(NOV + hour * HOUR).toISOString().replace('.000Z', 'Z'),
  sunAz: 0,
  earthAz: 0,
  dsn: null,
  sunEl: hour < 200 ? 5 : -5,
  earthEl: hour >= 100 && hour < 300 ? 8 : -2,
}));
const READY: HoursResult = { kind: 'ready', hours: SKY };
const at = (hour: number): number => NOV + hour * HOUR;

describe('site state: the pill and the desktop badge', () => {
  it.each([
    [50, 'sun', 'Sun only', 'Sun · 2 d left'],
    [150, 'window', 'Landing window now', 'Window · 2 d left'],
    [250, 'earth', 'Earth only', 'Earth · 2 d left'],
    [350, 'none', 'Neither', 'Neither · 30+ d left'],
  ])('at hour %i the state is %s: badge «%s», pill «%s»', (hour, kind, badge, line) => {
    expect(siteState(READY, at(hour))).toEqual({ kind, badge, line });
  });

  it('says the time left in hours under a day, so the pill stays one short line', () => {
    // Hour 190: the window ends at hour 200.
    expect(siteState(READY, at(190))?.line).toBe('Window · 10 h left');
    expect(siteState(READY, at(199))?.line).toBe('Window · 1 h left');
  });

  it('has no state while the month loads, fails, is outside the data, or before the clock runs', () => {
    for (const hours of [{ kind: 'loading' }, { kind: 'error' }, { kind: 'outside' }] as const) {
      expect(siteState(hours, at(150))).toBeNull();
    }
    expect(siteState(READY, null)).toBeNull();
  });

  it('tells pending hours from failed ones: a clock not yet running and a loading month are pending', () => {
    expect(hoursStatus({ kind: 'loading' }, at(150))).toBe('pending');
    expect(hoursStatus(READY, null)).toBe('pending');
    expect(hoursStatus({ kind: 'error' }, at(150))).toBe('error');
    expect(hoursStatus({ kind: 'outside' }, at(150))).toBe('outside');
    expect(hoursStatus(READY, at(150))).toBe('ready');
  });

  it('says why there is no state in the pill, never an empty line', () => {
    expect(stateLine(siteState(READY, at(150)), 'ready')).toBe('Window · 2 d left');
    expect(stateLine(null, 'pending')).toBe('Loading…');
    expect(stateLine(null, 'error')).toBe('Data unavailable');
    expect(stateLine(null, 'outside')).toBe('Outside the data window');
    expect(stateLine(null, 'ready')).toBe('No data for this hour');
  });
});

describe('site thumbnails', () => {
  it('gives a south pole site its LOLA thumbnail, with both densities, its frame and an alt text', () => {
    expect(thumbOf('im2-athena', 'Mons Mouton', '/')).toEqual({
      src: '/thumbs/im2-athena.jpg',
      srcset: '/thumbs/im2-athena.jpg 320w, /thumbs/im2-athena@2x.jpg 640w',
      alt: 'Mons Mouton from orbit, LOLA relief',
      caption: 'LOLA · 30 km',
    });
  });

  it('has no image for a site north of 80° S, nor for one the manifest does not hold', () => {
    expect(thumbOf('apollo11', 'Mare Tranquillitatis', '/')).toBeNull();
    expect(thumbOf('constructor', 'x', '/')).toBeNull();
  });

  it('shares one file between co-located sites, frames Haworth wide, and honours a base path', () => {
    expect(thumbOf('artemis-mons-mouton', 'Mons Mouton', '/')?.src).toBe('/thumbs/artemis-mons-mouton-plateau.jpg');
    expect(thumbOf('artemis-haworth', 'Haworth', '/')?.caption).toBe('LOLA · 62 km');
    expect(thumbOf('im2-athena', 'Mons Mouton', '/ventana')?.src).toBe('/ventana/thumbs/im2-athena.jpg');
  });
});
