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

/** The DSN block and view (VENT-7): the words, the day's band, the Earth's picture and the month's share. */
import { dsnSpans, skyAt, toMs, type DsnSpan, type HourSample } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { monthFacts } from '../src/card/month-facts';
import { clockText, leftText } from '../src/dsn/clock-text';
import { dayBand } from '../src/dsn/day-band';
import { createDsnDays } from '../src/dsn/dsn-days';
import { dsnModel } from '../src/dsn/dsn-model';
import { dsnText } from '../src/dsn/dsn-text';
import { earthPicture } from '../src/dsn/earth-picture';
import { nightPath } from '../src/dsn/earth-paths';
import { landDots } from '../src/dsn/land-dots';
import { EN, i18nOf } from './i18n-factories';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** The canvas instant: IM-2 Athena, 22 November 2026 20:00 UTC. */
const CANVAS = toMs('2026-11-22T20:00:00Z');
const DAY = toMs('2026-11-22T00:00:00Z');
const spans = dsnSpans(DAY, DAY + 2 * DAY_MS);
const NO_LINK_AT = toMs('2026-11-14T18:00:00Z');

describe('dsnText', () => {
  it('names Robledo with the Moon at 52°, about 6 h left and Goldstone next tomorrow at 02:16 UTC', () => {
    const text = dsnText(dsnModel(spans, CANVAS, 10.2), EN);
    expect(text).toMatchObject({
      kind: 'listening',
      title: 'Robledo',
      place: 'Madrid',
      moon: 'Moon at 52°',
      moonShort: 'Moon 52°',
      left: '~6 h left',
      next: 'Next: Goldstone tomorrow at 02:16 UTC',
    });
  });

  it('adds the day only when the next turn is on another UTC day', () => {
    const lateOnDay = toMs('2026-11-22T23:59:00Z');
    expect(dsnText(dsnModel(spans, lateOnDay, 10), EN).next).toBe('Next: Goldstone tomorrow at 02:16 UTC');
    const sameDay = toMs('2026-11-23T00:30:00Z');
    expect(dsnText(dsnModel(spans, sameDay, 10), EN).next).toBe('Next: Goldstone at 02:16 UTC');
    const words = { es: 'Después: Goldstone mañana a las 02:16 UTC', fr: 'Ensuite : Goldstone demain à 02:16 UTC', de: 'Danach: Goldstone morgen um 02:16 UTC', it: 'Poi: Goldstone domani alle 02:16 UTC' } as const;
    for (const [locale, next] of Object.entries(words)) {
      expect(dsnText(dsnModel(spans, lateOnDay, 10), i18nOf(locale as keyof typeof words)).next).toBe(next);
    }
  });

  it('counts the minutes in the last hour, to the minute', () => {
    const text = dsnText(dsnModel(spans, toMs('2026-11-23T02:00:00Z'), 10.3), EN);
    expect(text.left).toBe('16 min left');
    expect(leftText(EN, 60_000)).toBe('1 min left');
    expect(leftText(EN, 90 * 60_000)).toBe('~2 h left');
  });

  it('says «No link» first, why, and which complex would listen', () => {
    const point = { latDeg: -85.5, lonEastDeg: 31 };
    const earthEl = skyAt(point, NO_LINK_AT).earthEl;
    const day = dsnSpans(toMs('2026-11-14T00:00:00Z'), toMs('2026-11-16T00:00:00Z'));
    const text = dsnText(dsnModel(day, NO_LINK_AT, earthEl), EN);
    expect(text).toMatchObject({ kind: 'noLink', title: 'No link', reason: 'Earth below the horizon', would: 'Robledo would listen', left: '', next: '' });
    expect(dsnText(dsnModel(day, NO_LINK_AT, 1.4), EN).reason).toBe('Earth too low here (needs 3°)');
  });

  it('with no complex above 10°, says so and when the next one starts', () => {
    const text = dsnText(dsnModel(spans, toMs('2026-11-23T16:44:00Z'), 10), EN);
    expect(text).toMatchObject({ kind: 'silent', title: 'No antenna', next: 'Next: Robledo at 16:48 UTC' });
  });

  it('without the site\'s Earth, still names the complex', () => {
    expect(dsnText(dsnModel(spans, CANVAS, null), EN).title).toBe('Robledo');
  });

  it('writes times on the 24-hour UTC clock in every language', () => {
    for (const locale of ['en', 'es', 'fr', 'de', 'it'] as const) {
      expect(clockText(i18nOf(locale), toMs('2026-11-23T02:16:00Z'))).toBe('02:16');
    }
    expect(dsnText(dsnModel(spans, CANVAS, 10), i18nOf('es')).title).toBe('Robledo');
  });
});

describe('dayBand', () => {
  const band = dayBand(spans, CANVAS);

  it('puts the playhead at 20:00 and marks Robledo as listening', () => {
    expect(band.playhead).toBeCloseTo(20 / 24, 6);
    expect(band.rows.map((r) => [r.complex, r.now])).toEqual([['goldstone', false], ['canberra', false], ['madrid', true]]);
  });

  it('keeps every part inside the day, and the active parts inside the parts above 10°', () => {
    for (const row of band.rows) {
      for (const part of row.active) {
        expect(part.from).toBeGreaterThanOrEqual(0);
        expect(part.to).toBeLessThanOrEqual(1);
        expect(row.above.some((a) => a.from <= part.from && a.to >= part.to)).toBe(true);
      }
    }
    const madrid = band.rows.find((r) => r.complex === 'madrid')!;
    expect(madrid.active.at(-1)?.to).toBe(1);
  });
});

describe('createDsnDays', () => {
  it('works a day out once and keeps a few', () => {
    const compute = vi.fn((from: number, to: number): DsnSpan[] => [{ startMs: from, endMs: to, active: null, above: [] }]);
    const days = createDsnDays(compute);
    days.spansFor(CANVAS);
    days.spansFor(CANVAS + HOUR_MS);
    expect(compute).toHaveBeenCalledTimes(1);
    for (let d = 1; d <= 5; d++) days.spansFor(CANVAS + d * DAY_MS);
    days.spansFor(CANVAS);
    expect(compute).toHaveBeenCalledTimes(7);
    expect(compute).toHaveBeenNthCalledWith(1, DAY, DAY + 2 * DAY_MS);
  });
});

describe('the Earth seen from the Moon', () => {
  const dots = landDots(4);

  it('has land dots, fewer as the stride grows', () => {
    expect(dots.length).toBeGreaterThan(300);
    expect(landDots(2).length).toBeGreaterThan(dots.length * 3);
  });

  it('on the card, centres the Moon overhead and shows the antenna that listens', () => {
    const picture = earthPicture({ atMs: CANVAS, r: 50, dots, wide: false, state: { active: 'madrid', above: ['madrid'] } });
    expect(picture.moon).toEqual({ x: 50, y: 50, front: true });
    const madrid = picture.stations.find((s) => s.complex === 'madrid')!;
    expect(madrid).toMatchObject({ active: true, sees: true, front: true });
    expect(picture.land).toMatch(/^M[\d.]+ [\d.]+h0/);
  });

  it('in the view, looks from further west, with the ring\'s edge in sight', () => {
    const picture = earthPicture({ atMs: CANVAS, r: 50, dots, wide: true, state: { active: 'madrid', above: ['madrid'] } });
    expect(picture.moon.x).toBeGreaterThan(60);
    expect(picture.ring.d).toMatch(/^M/);
    expect(picture.ring.top).not.toBeNull();
    expect(picture.stations.find((s) => s.complex === 'goldstone')?.front).toBe(true);
  });

  it('draws no night with the Sun behind the viewer, and the whole disk with it in front', () => {
    const r = 10;
    const ys = (d: string) => d.slice(1, -1).split('L').map((p) => p.split(' ').map(Number));
    const lit = ys(nightPath({ x: 0, y: 0, z: 1 }, r));
    expect(Math.max(...lit.map(([x, y]) => Math.hypot(x! - r, y! - r)))).toBeCloseTo(r, 1);
    const area = (pts: number[][]) => Math.abs(pts.reduce((sum, [x, y], i) => {
      const [nx, ny] = pts[(i + 1) % pts.length]!;
      return sum + x! * ny! - nx! * y!;
    }, 0)) / 2;
    expect(area(lit)).toBeLessThan(1);
    expect(area(ys(nightPath({ x: 0, y: 0, z: -1 }, r)))).toBeCloseTo(Math.PI * r * r, -1);
    expect(area(ys(nightPath({ x: 1, y: 0, z: 0 }, r)))).toBeCloseTo((Math.PI * r * r) / 2, -1);
  });
});

describe('the month\'s DSN share', () => {
  it('counts the hours with a complex listening', () => {
    const hours: HourSample[] = Array.from({ length: 30 * 24 }, (_, i) => ({
      t: new Date(toMs('2026-11-01T00:00:00Z') + i * HOUR_MS).toISOString(),
      sunEl: 1, sunAz: 0, earthEl: 5, earthAz: 0,
      dsn: i % 4 === 0 ? null : 'madrid',
    }));
    const rows = monthFacts(hours, CANVAS, EN)!;
    expect(rows.find((r) => r.label === 'Hours with DSN')?.value).toBe('75 %');
  });
});
