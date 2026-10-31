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
import { computedHours, type HourSample } from '@ventana/sim';
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
import { monthView } from '../src/source/month-view';
import type { HoursResult } from '../src/phone/widgets-loader';

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

  it('asks for the month of the instant, and none outside the data window', () => {
    const load = vi.fn(() => []);
    computedMonth(load, 'im2-athena', Date.UTC(2026, 10, 14, 9));
    expect(load).toHaveBeenCalledWith('im2-athena', expect.objectContaining({ from: '2026-11-01T00:00:00Z' }));
    expect(computedMonth(load, 'im2-athena', Date.UTC(2029, 0, 1))).toBeNull();
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

  it('Horizons: an honest error when Horizons fails, never the computed hours in its place', () => {
    expect(monthView('horizons', ERROR, SIM)).toMatchObject({ result: ERROR, computed: false });
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

  it('counts only the hours of the month, and only those both sides hold', () => {
    const api = november((i) => (i === 0 ? [-1, 5] : [5, 5]));
    const diff = monthDiff(api, november().slice(1), AT);
    expect(diff.hours).toBe(0);
  });
});
