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
 * The data source (VENT-36): the visitor's choice of Computed, Horizons or
 * Compare, kept on the device; the simulator's hours for a site and month;
 * what the views show while Horizons is on its way; and the hours where
 * the two disagree.
 */
import { computedHours, VALIDATED_ELEVATION_DEG, type HourSample } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { monthDiff } from '../src/calendar/month-diff';
import {
  createSourceStore,
  readSource,
  SOURCE_KEY,
} from '../src/source/data-source';
import {
  cachedComputed,
  computedMonth,
  pointsOf,
} from '../src/source/computed-hours';
import { computedCaption } from '../src/source/computed-caption';
import { monthView } from '../src/source/month-view';
import { canShiftMonth } from '../src/calendar/time-actions';
import { siteState } from '../src/phone/site-state';
import { widgetRange } from '../src/phone/widget-range';
import { widgetsAt, type HoursResult } from '../src/phone/widgets-loader';
import { EN } from './i18n-factories';

/** A storage that keeps strings in a map. */
function memoryStorage(initial: Record<string, string> = {}) {
  const kept = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
    kept,
  };
}

const refusing = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

describe('the data source store', () => {
  it('starts on Horizons when nothing is kept', () => {
    expect(createSourceStore(memoryStorage()).get()).toBe('horizons');
    expect(createSourceStore(null).get()).toBe('horizons');
  });

  it('starts on the kept choice, and ignores anything else kept', () => {
    expect(readSource(memoryStorage({ [SOURCE_KEY]: 'compare' }))).toBe('compare');
    expect(readSource(memoryStorage({ [SOURCE_KEY]: 'nonsense' }))).toBe('horizons');
  });

  it('keeps a new choice and tells its listeners once', () => {
    const storage = memoryStorage();
    const store = createSourceStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set('computed');
    store.set('computed');
    expect(listener).toHaveBeenCalledOnce();
    expect(storage.kept.get(SOURCE_KEY)).toBe('computed');
  });

  it('works without keeping anything when storage refuses access', () => {
    const store = createSourceStore(refusing);
    expect(store.get()).toBe('horizons');
    store.set('compare');
    expect(store.get()).toBe('compare');
  });
});

const IM2 = { id: 'im2-athena', lat: -84.7906, lonEast: 29.1957 };
const RANGE = { from: '2026-11-01T00:00:00Z', to: '2026-11-01T05:00:00Z' };

describe('the computed hours', () => {
  it('gives the simulator hours of a listed site for the range, both ends included', () => {
    const load = cachedComputed(pointsOf([IM2]));
    const hours = load('im2-athena', RANGE);
    expect(hours).toHaveLength(6);
    const point = { latDeg: IM2.lat, lonEastDeg: IM2.lonEast };
    expect(hours).toEqual(computedHours(point, RANGE.from, RANGE.to));
  });

  it('computes a site and range once', () => {
    const load = cachedComputed(pointsOf([IM2]));
    expect(load('im2-athena', RANGE)).toBe(load('im2-athena', RANGE));
  });

  it('has none for a site without coordinates', () => {
    const unlisted = { id: 'new-site', lat: Number.NaN, lonEast: Number.NaN };
    const load = cachedComputed(pointsOf([IM2, unlisted]));
    expect(load('new-site', RANGE)).toBeNull();
    expect(load('nowhere', RANGE)).toBeNull();
  });

  it('asks for the month of the instant, in any year: the simulator has no data window', () => {
    const load = vi.fn(() => []);
    computedMonth(load, 'im2-athena', Date.UTC(2026, 10, 14, 9));
    expect(load).toHaveBeenCalledWith('im2-athena', expect.objectContaining({ from: '2026-11-01T00:00:00Z' }));
    expect(computedMonth(load, 'im2-athena', Date.UTC(2029, 0, 1))).toEqual([]);
    expect(load).toHaveBeenLastCalledWith(
      'im2-athena',
      expect.objectContaining({ from: '2029-01-01T00:00:00Z', to: '2029-03-02T23:00:00Z' }),
    );
  });

  // Verificador on PR #19: a key without the site would hand one site's hours to another.
  it('keeps each site apart: two sites over the same range get their own hours', () => {
    const shackleton = { id: 'shackleton', lat: -89.67, lonEast: 129.78 };
    const load = cachedComputed(pointsOf([IM2, shackleton]));
    const im2 = load('im2-athena', RANGE);
    const other = load('shackleton', RANGE);
    expect(other).not.toEqual(im2);
    expect(other).toEqual(computedHours({ latDeg: shackleton.lat, lonEastDeg: shackleton.lonEast }, RANGE.from, RANGE.to));
  });

  // Ready for VENT-10's free pin: the same id at a new point is a new sky.
  it('keys the hours by the point, so a site that moves is computed again', () => {
    let point = { latDeg: IM2.lat, lonEastDeg: IM2.lonEast };
    const load = cachedComputed(() => point);
    const before = load('pin', RANGE);
    point = { latDeg: -89.67, lonEastDeg: 129.78 };
    expect(load('pin', RANGE)).toEqual(computedHours(point, RANGE.from, RANGE.to));
    expect(load('pin', RANGE)).not.toEqual(before);
  });
});

describe('Computed answers any month', () => {
  const MARCH_2029 = Date.UTC(2029, 2, 10, 6);
  const point = { latDeg: IM2.lat, lonEastDeg: IM2.lonEast };

  it('has an open range outside the data window, and none for the API', () => {
    expect(widgetRange(MARCH_2029)).toBeNull();
    expect(widgetRange(MARCH_2029, true)).toMatchObject({
      from: '2029-03-01T00:00:00Z',
      at: '2029-03-10T06:00:00Z',
      to: '2029-04-30T23:00:00Z',
    });
  });

  it('holds the API range at the end of the window, but not the open one', () => {
    const lastMonth = Date.UTC(2027, 11, 20);
    expect(widgetRange(lastMonth)?.to).toBe('2027-12-31T23:00:00Z');
    expect(widgetRange(lastMonth, true)?.to).toBe('2028-01-30T23:00:00Z');
  });

  it('gives the widgets and the state of a computed month outside the window', () => {
    const range = widgetRange(MARCH_2029, true)!;
    const hours = ready(computedHours(point, range.from, range.to));
    expect(widgetsAt(hours, MARCH_2029, EN).kind).toBe('error');
    expect(widgetsAt(hours, MARCH_2029, EN, true).kind).toBe('ready');
    expect(siteState(hours, MARCH_2029, EN)).toBeNull();
    expect(siteState(hours, MARCH_2029, EN, true)?.kind).toMatch(/^(sun|earth|window|none)$/);
  });

  it('lets the month arrows leave the data window only when open', () => {
    const december2027 = Date.UTC(2027, 11, 15);
    expect(canShiftMonth(december2027, 1)).toBe(false);
    expect(canShiftMonth(december2027, 1, true)).toBe(true);
    expect(canShiftMonth(Date.UTC(2026, 0, 15), -1, true)).toBe(true);
  });
});

const hour = (t: string, sunEl: number, earthEl: number): HourSample => ({
  t,
  sunEl,
  sunAz: 0,
  earthEl,
  earthAz: 0,
  dsn: null,
});
const SIM = [hour('2026-11-01T00:00:00Z', 5, 5)];
const API = [hour('2026-11-01T00:00:00Z', 4, 4)];
const ready = (hours: HourSample[]): HoursResult => ({ kind: 'ready', hours });
const LOADING: HoursResult = { kind: 'loading' };
const ERROR: HoursResult = { kind: 'error' };

describe('what the views show', () => {
  it('Horizons: the computed hours at once, marked computed, until Horizons arrives', () => {
    expect(monthView('horizons', LOADING, SIM)).toMatchObject({ result: ready(SIM), computed: true });
    expect(monthView('horizons', ready(API), SIM)).toMatchObject({ result: ready(API), computed: false });
  });

  // Orchestrator's decision on PR #19: a failed Horizons keeps the computed answer, and says so.
  it('Horizons: when Horizons fails, the computed hours stay, marked computed and with Horizons down', () => {
    expect(monthView('horizons', ERROR, SIM)).toMatchObject({ result: ready(SIM), computed: true, horizonsDown: true });
    expect(monthView('horizons', ready(API), SIM).horizonsDown).toBe(false);
    expect(monthView('horizons', LOADING, SIM).horizonsDown).toBe(false);
  });

  it('Horizons: an honest error when Horizons fails and there is nothing computed to show', () => {
    expect(monthView('horizons', ERROR, null)).toMatchObject({ result: ERROR, computed: false, horizonsDown: false });
  });

  it('Horizons: still loading when there is nothing to compute (a site without coordinates)', () => {
    expect(monthView('horizons', LOADING, null)).toMatchObject({ result: LOADING, computed: false });
  });

  it('Computed: always the computed hours, and Horizons when they cannot be computed', () => {
    expect(monthView('computed', ready(API), SIM)).toMatchObject({ result: ready(SIM), computed: true });
    expect(monthView('computed', ERROR, SIM)).toMatchObject({ result: ready(SIM), computed: true });
    expect(monthView('computed', ready(API), null)).toMatchObject({ result: ready(API), computed: false });
  });

  it('Compare: shows Horizons and holds both for the comparison', () => {
    const view = monthView('compare', ready(API), SIM);
    expect(view).toMatchObject({ result: ready(API), computed: false });
    expect(view.compare).toEqual({ kind: 'ready', computed: SIM });
  });

  it('Compare: pending while Horizons loads, unavailable when it fails', () => {
    expect(monthView('compare', LOADING, SIM).compare).toEqual({ kind: 'pending' });
    expect(monthView('compare', ERROR, SIM).compare).toEqual({ kind: 'unavailable' });
    // Verificador on PR #19: the computed hours stay and Horizons is down, so the note offers «Try again» here too.
    expect(monthView('compare', ERROR, SIM)).toMatchObject({ result: ready(SIM), computed: true, horizonsDown: true });
    expect(monthView('compare', LOADING, SIM).horizonsDown).toBe(false);
    expect(monthView('computed', ERROR, SIM).horizonsDown).toBe(false);
    expect(monthView('compare', ready(API), null).compare).toEqual({ kind: 'unavailable' });
  });

  it('compares nothing outside Compare', () => {
    expect(monthView('horizons', ready(API), SIM).compare).toEqual({ kind: 'off' });
    expect(monthView('computed', ready(API), SIM).compare).toEqual({ kind: 'off' });
  });
});

/** November 2026's hours, Sun and Earth up everywhere except where `edit` says. */
function november(edit: (index: number) => [number, number] = () => [5, 5]) {
  const hours: HourSample[] = [];
  for (let i = 0; i < 720; i += 1) {
    const [sunEl, earthEl] = edit(i);
    hours.push(hour(new Date(Date.UTC(2026, 10, 1) + i * 3_600_000).toISOString().replace('.000Z', 'Z'), sunEl, earthEl));
  }
  return hours;
}

describe('monthDiff', () => {
  const AT = Date.UTC(2026, 10, 14);

  it('finds no difference between equal months', () => {
    const diff = monthDiff(november(), november(), AT);
    expect(diff).toEqual({ sun: [], earth: [], window: [], hours: 0 });
  });

  it('places each signal that disagrees on its own bar and counts the hours once', () => {
    // Hour 72: Sun set in Horizons only. Hours 360-361: Earth below 3° in computed only.
    const api = november((i) => (i === 72 ? [-1, 5] : [5, 5]));
    const sim = november((i) => (i === 360 || i === 361 ? [5, 2] : [5, 5]));
    const diff = monthDiff(api, sim, AT);
    expect(diff.sun).toEqual([{ startPct: 10, widthPct: 100 / 720 }]);
    expect(diff.earth).toEqual([{ startPct: 50, widthPct: 200 / 720 }]);
    expect(diff.window).toHaveLength(2);
    expect(diff.hours).toBe(3);
  });

  it('breaks a run of disagreeing hours where the computed side lacks an hour', () => {
    // Hours 100-104 disagree on the Sun; the computed side has no hour 102.
    const api = november((i) => (i >= 100 && i <= 104 ? [-1, 5] : [5, 5]));
    const sim = november().filter((_, i) => i !== 102);
    const diff = monthDiff(api, sim, AT);
    expect(diff.sun).toEqual([
      { startPct: (100 * 100) / 720, widthPct: 200 / 720 },
      { startPct: (100 * 103) / 720, widthPct: 200 / 720 },
    ]);
    expect(diff.hours).toBe(4);
  });

  it('counts only the hours of the month, and only those both sides hold', () => {
    const api = november((i) => (i === 0 ? [-1, 5] : [5, 5]));
    const diff = monthDiff(api, november().slice(1), AT);
    expect(diff.hours).toBe(0);
  });
});

// Javier's decision on PR #19: computed data says it is ours and approximate, and never overclaims outside the
// months the model was checked against Horizons.
describe('the computed caption', () => {
  // The bound is on elevation only (the Sun's azimuth differs by up to 0.17°): the caption says so.
  it('states the validated elevation bound in a checked month', () => {
    expect(computedCaption(EN, Date.UTC(2026, 10, 23, 18))).toBe(
      `Computed by Ventana Lunar · approximate: elevations within ${VALIDATED_ELEVATION_DEG}° of JPL Horizons`,
    );
    expect(computedCaption(EN, Date.UTC(2026, 11, 31, 23))).toContain('within');
  });

  it('says a month outside the checked period is extrapolated', () => {
    for (const atMs of [Date.UTC(2026, 9, 31, 23), Date.UTC(2027, 0, 1), Date.UTC(2029, 2, 10)]) {
      expect(computedCaption(EN, atMs)).toBe(
        'Computed by Ventana Lunar · extrapolated: not checked against JPL Horizons for this month',
      );
    }
  });
});
