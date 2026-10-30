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
import { hourKeyDelta, hourAtOffset } from '../src/calendar/hour-input';
import { formatChip, formatInstant, monthLabel } from '../src/calendar/instant-format';
import { dayTicks, monthEndMs, monthHours, monthStartMs, shiftMonth } from '../src/calendar/month';
import { instantPct, monthStrip } from '../src/calendar/month-strip';
import { canShiftMonth, hourOfMonth, moveMonths, moveToHour } from '../src/calendar/time-actions';
import { createTimeStore } from '../src/calendar/time-store';

const HOUR = 3_600_000;
const AT = Date.parse('2026-11-23T18:20:00Z');

/** Every hour of November 2026 and the first week of December, with the Sun and the Earth from `sky`. */
function novemberHours(sky: (hour: number) => Pick<HourSample, 'sunEl' | 'earthEl'>): HourSample[] {
  const start = Date.parse('2026-11-01T00:00:00Z');
  return Array.from({ length: 37 * 24 }, (_, hour) => ({
    t: new Date(start + hour * HOUR).toISOString().replace('.000Z', 'Z'),
    sunAz: 0,
    earthAz: 0,
    dsn: null,
    ...sky(hour),
  }));
}

describe('month', () => {
  it('spans the UTC month of an instant', () => {
    expect(monthStartMs(AT)).toBe(Date.parse('2026-11-01T00:00:00Z'));
    expect(monthEndMs(AT)).toBe(Date.parse('2026-11-30T23:00:00Z'));
    expect(monthHours(AT)).toBe(720);
    expect(monthHours(Date.parse('2027-02-10T00:00:00Z'))).toBe(28 * 24);
  });

  it('moves by whole months, keeping the day and the hour', () => {
    expect(shiftMonth(AT, 1)).toBe(Date.parse('2026-12-23T18:00:00Z'));
    expect(shiftMonth(AT, -1)).toBe(Date.parse('2026-10-23T18:00:00Z'));
    expect(shiftMonth(AT, 2)).toBe(Date.parse('2027-01-23T18:00:00Z'));
  });

  it('holds the day to the end of a shorter month', () => {
    expect(shiftMonth(Date.parse('2027-01-31T05:00:00Z'), 1)).toBe(Date.parse('2027-02-28T05:00:00Z'));
  });

  it('puts the day ticks where the canvas does, and drops the 29th in a 28-day month', () => {
    const ticks = dayTicks(AT).map(({ day, pct }) => [day, Number(pct.toFixed(2))]);
    expect(ticks).toEqual([[1, 0], [8, 23.33], [15, 46.67], [22, 70], [29, 93.33]]);
    expect(dayTicks(Date.parse('2027-02-01T00:00:00Z')).map(({ day }) => day)).toEqual([1, 8, 15, 22]);
  });
});

describe('instant formats', () => {
  it('writes the date as the canvas does', () => {
    expect(formatInstant(AT)).toBe('Mon 23 Nov · 18:00 UTC');
    expect(formatChip(AT)).toBe('23 · 18:00');
    expect(monthLabel(AT)).toBe('November 2026');
    expect(formatInstant(Date.parse('2026-09-05T07:59:00Z'))).toBe('Sat 5 Sep · 07:00 UTC');
  });
});

describe('monthStrip', () => {
  // The Sun up for the first 5 hours and from hour 293 on; the Earth up for the first 74 hours and from hour 378.
  const sky = (hour: number) => ({
    sunEl: hour < 5 || hour >= 293 ? 4 : -4,
    earthEl: hour < 74 || hour >= 378 ? 6 : 2,
  });

  it('turns the month into Sun, Earth and window segments, as % of the month', () => {
    const strip = monthStrip(novemberHours(sky), AT);
    const round = (list: readonly { startPct: number; widthPct: number }[] | undefined) =>
      list?.map(({ startPct, widthPct }) => [Number(startPct.toFixed(3)), Number(widthPct.toFixed(3))]);
    expect(round(strip?.sun)).toEqual([[0, 0.694], [40.694, 59.306]]);
    expect(round(strip?.earth)).toEqual([[0, 10.278], [52.5, 47.5]]);
    expect(round(strip?.window)).toEqual([[0, 0.694], [52.5, 47.5]]);
  });

  it('uses the same thresholds as the widgets: Sun above 0°, Earth above 3°', () => {
    const edge = monthStrip(novemberHours(() => ({ sunEl: 0, earthEl: 3 })), AT);
    expect(edge).toMatchObject({ sun: [], earth: [], window: [], sunPct: 0, earthPct: 0, windowPct: 0 });
    const up = monthStrip(novemberHours(() => ({ sunEl: 0.1, earthEl: 3.1 })), AT);
    expect(up).toMatchObject({ sunPct: 100, earthPct: 100, windowPct: 100 });
  });

  it('counts the month only, not the days after it', () => {
    const strip = monthStrip(novemberHours((hour) => ({ sunEl: hour < 360 ? 5 : -5, earthEl: 9 })), AT);
    expect(strip?.sunPct).toBe(50);
    expect(strip?.windowPct).toBe(50);
  });

  it('is null when the hours hold nothing of the month', () => {
    expect(monthStrip(novemberHours(sky), Date.parse('2027-03-01T00:00:00Z'))).toBeNull();
  });

  it('places the instant on its hour', () => {
    expect(instantPct(AT)).toBeCloseTo(75.83, 2);
    expect(instantPct(Date.parse('2026-11-01T00:59:00Z'))).toBe(0);
  });
});

describe('hour input', () => {
  it('moves an hour with the arrows and a day with the page keys', () => {
    expect(['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'PageUp', 'PageDown'].map((k) => hourKeyDelta(k, 'horizontal'))).toEqual([1, 1, -1, -1, 24, -24]);
  });

  it('runs downwards in the vertical columns, where later is lower', () => {
    expect(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].map((k) => hourKeyDelta(k, 'vertical'))).toEqual([1, -1, 24, -24]);
  });

  it('ignores other keys', () => {
    expect(hourKeyDelta('Enter', 'horizontal')).toBeNull();
  });

  it('maps a position along the columns to an hour of the month, inside it', () => {
    expect(hourAtOffset(0, 400, 720)).toBe(0);
    expect(hourAtOffset(200, 400, 720)).toBe(360);
    expect(hourAtOffset(-20, 400, 720)).toBe(0);
    expect(hourAtOffset(500, 400, 720)).toBe(719);
  });
});

describe('time actions', () => {
  const store = () => createTimeStore(() => AT);

  it('selects an hour of the month, held inside it', () => {
    const time = store();
    moveToHour(time, AT, 0);
    expect(time.get()).toEqual({ atMs: Date.parse('2026-11-01T00:00:00Z'), live: false });
    moveToHour(time, AT, 9999);
    expect(time.get().atMs).toBe(Date.parse('2026-11-30T23:00:00Z'));
    expect(hourOfMonth(Date.parse('2026-11-30T23:00:00Z'))).toBe(719);
  });

  it('moves by months inside the data window (2026 and 2027) only', () => {
    const time = store();
    moveMonths(time, AT, 1);
    expect(time.get().atMs).toBe(Date.parse('2026-12-23T18:00:00Z'));
    expect(canShiftMonth(Date.parse('2026-01-10T00:00:00Z'), -1)).toBe(false);
    expect(canShiftMonth(Date.parse('2027-12-10T00:00:00Z'), 1)).toBe(false);
    const edge = createTimeStore(() => Date.parse('2027-12-10T00:00:00Z'));
    moveMonths(edge, edge.get().atMs, 1);
    expect(edge.get().live).toBe(true);
  });
});
