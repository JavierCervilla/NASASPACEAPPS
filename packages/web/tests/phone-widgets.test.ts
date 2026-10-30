import { describe, expect, it, vi } from 'vitest';
import { bodyWidget, EARTH, SUN } from '../src/phone/body-widget';
import { dsnWidget } from '../src/phone/dsn-widget';
import { formatAtLeast, formatCoords, formatDuration, formatElevation, formatShare } from '../src/phone/format';
import { widgetRange, type WidgetRange } from '../src/phone/widget-range';
import { nowState, nowWidget } from '../src/phone/now-widget';
import { hoursUrl, parseHours } from '../src/phone/site-hours';
import { sampleAt, siteWidgets } from '../src/phone/site-widgets';
import { loadWidgets } from '../src/phone/widgets-loader';
import { hourAt, hoursOf, upUntil } from './phone-factories';

const sample = (sunEl: number, earthEl: number) => ({ sunEl, earthEl });

describe('formats', () => {
  it('writes durations in days and hours, as on the canvas', () => {
    expect(formatDuration(169)).toBe('7 d 1 h');
    expect(formatDuration(72)).toBe('3 d');
    expect(formatDuration(5)).toBe('5 h');
  });

  it('writes an open end as «at least»', () => {
    expect(formatAtLeast(173)).toBe('at least 7 d');
    expect(formatAtLeast(5)).toBe('at least 5 h');
  });

  it('writes elevations above and below the horizon', () => {
    expect(formatElevation('Sun', 6.42)).toBe('Sun 6.4° up');
    expect(formatElevation('Earth', -2)).toBe('Earth 2.0° below');
  });

  it('writes coordinates with hemispheres, east longitudes past 180 as west', () => {
    expect(formatCoords(-84.7906, 29.1957)).toBe('84.79° S, 29.20° E');
    expect(formatCoords(26.13, 300)).toBe('26.13° N, 60.00° W');
  });

  it('writes the month share', () => {
    expect(formatShare(47.4, 'November')).toBe('47 % of November');
  });
});

describe('nowWidget', () => {
  it('names the four states by the spec thresholds (Sun > 0°, Earth > 3°)', () => {
    expect(nowState(sample(1, 4))).toBe('window');
    expect(nowState(sample(1, 3))).toBe('sun');
    expect(nowState(sample(0, 4))).toBe('earth');
    expect(nowState(sample(-1, 0))).toBe('none');
  });

  it('titles the state and carries the month share', () => {
    expect(nowWidget(sample(6.4, 10.6), 47, 'November')).toEqual({
      state: 'window',
      title: 'Landing window',
      detail: '47 % of November',
    });
    expect(nowWidget(sample(-1, -1), 0, 'May').title).toBe('No window');
  });
});

describe('bodyWidget', () => {
  it('counts down to sunset while the Sun is up', () => {
    const hours = hoursOf(240, { sunEl: upUntil(169), earthEl: () => 10 });
    const widget = bodyWidget(SUN, hours, hours[0]!);
    expect(widget).toEqual({ label: 'Sunset in', value: '7 d 1 h', detail: 'Sun 10.0° up' });
  });

  it('turns into sunrise while the Sun is down', () => {
    const hours = hoursOf(48, { sunEl: (h) => (h < 30 ? -4 : 2), earthEl: () => 10 });
    expect(bodyWidget(SUN, hours, hours[0]!)).toEqual({ label: 'Sunrise in', value: '1 d 6 h', detail: 'Sun 4.0° below' });
  });

  it('says «at least» when the body outlasts the range', () => {
    const hours = hoursOf(174, { sunEl: () => 5, earthEl: () => 10.6 });
    const widget = bodyWidget(EARTH, hours, hours[0]!);
    expect(widget).toEqual({ label: 'Earthset in', value: 'at least 7 d', detail: 'Earth 10.6° up' });
  });

  it('uses the Earth threshold of 3°, not the horizon', () => {
    const hours = hoursOf(10, { sunEl: () => 5, earthEl: (h) => (h < 4 ? 2 : 4) });
    expect(bodyWidget(EARTH, hours, hours[0]!).label).toBe('Earthrise in');
    expect(bodyWidget(EARTH, hours, hours[0]!).value).toBe('4 h');
  });
});

describe('dsnWidget', () => {
  it('names the listening complex and how long it stays', () => {
    const hours = hoursOf(30, { sunEl: () => 5, earthEl: () => 5, dsn: (h) => (h < 12 ? 'madrid' : 'goldstone') });
    expect(dsnWidget(hours, hours[0]!)).toEqual({ value: 'Robledo', detail: 'Madrid · ~12 h left' });
  });

  it('says when the next complex picks the Moon up', () => {
    const hours = hoursOf(30, { sunEl: () => 5, earthEl: () => 5, dsn: (h) => (h < 3 ? null : 'canberra') });
    expect(dsnWidget(hours, hours[0]!)).toEqual({ value: 'No antenna', detail: 'Canberra in ~3 h' });
  });

  it('says so when no complex listens for the rest of the range', () => {
    const hours = hoursOf(5, { sunEl: () => 5, earthEl: () => 5 });
    expect(dsnWidget(hours, hours[0]!)).toEqual({ value: 'No antenna', detail: 'None for at least 5 h' });
  });

  it('says «at least» when the complex outlasts the range', () => {
    const hours = hoursOf(5, { sunEl: () => 5, earthEl: () => 5, dsn: () => 'goldstone' });
    expect(dsnWidget(hours, hours[0]!)).toEqual({ value: 'Goldstone', detail: 'California · at least 5 h left' });
  });
});

describe('siteWidgets', () => {
  const hours = hoursOf(48, { sunEl: upUntil(24), earthEl: () => 10, dsn: () => 'canberra' });
  /** A range over the 48 hours, its month the first 24 and its horizon from `at` to the end. */
  const rangeAt = (at: number): WidgetRange => ({
    from: hourAt(0),
    to: hourAt(47),
    at: hourAt(at),
    monthEnd: hourAt(23),
    horizonEnd: hourAt(47),
    month: 'November',
  });

  it('builds the four widgets at the reference hour', () => {
    const widgets = siteWidgets(hours, rangeAt(20));
    expect(widgets?.now).toEqual({ state: 'window', title: 'Landing window', detail: '100 % of November' });
    expect(widgets?.sun.value).toBe('4 h');
    expect(widgets?.earth.value).toBe('at least 1 d');
    expect(widgets?.dsn.value).toBe('Canberra');
  });

  it('counts the share over the month only and the countdowns over the horizon only', () => {
    const widgets = siteWidgets(hours, { ...rangeAt(20), monthEnd: hourAt(47), horizonEnd: hourAt(22) });
    expect(widgets?.now.detail).toBe('50 % of November');
    expect(widgets?.earth.value).toBe('at least 3 h');
  });

  it('is null when no sample covers the hour', () => {
    expect(siteWidgets(hours, { ...rangeAt(60), horizonEnd: hourAt(70) })).toBeNull();
    expect(sampleAt([], hourAt(0))).toBeNull();
  });
});

describe('widgetRange', () => {
  it('joins the UTC month to a 30-day horizon from the current hour', () => {
    expect(widgetRange(Date.parse('2026-10-30T10:42:00Z'))).toEqual({
      from: '2026-10-01T00:00:00Z',
      to: '2026-11-29T10:00:00Z',
      at: '2026-10-30T10:00:00Z',
      monthEnd: '2026-10-31T23:00:00Z',
      horizonEnd: '2026-11-29T10:00:00Z',
      month: 'October',
    });
  });

  it('asks to the end of the month when the horizon ends first', () => {
    expect(widgetRange(Date.parse('2026-01-01T00:00:00Z'))).toMatchObject({
      to: '2026-01-31T23:00:00Z',
      horizonEnd: '2026-01-31T00:00:00Z',
    });
  });

  it('holds the horizon inside the data window', () => {
    expect(widgetRange(Date.parse('2027-12-20T05:00:00Z'))).toMatchObject({
      to: '2027-12-31T23:00:00Z',
      horizonEnd: '2027-12-31T23:00:00Z',
      month: 'December',
    });
  });

  it('has no range outside the data window (2026 and 2027)', () => {
    expect(widgetRange(Date.parse('2025-12-31T23:59:59Z'))).toBeNull();
    expect(widgetRange(Date.parse('2028-01-01T00:00:00Z'))).toBeNull();
    expect(widgetRange(Date.parse('2027-12-31T23:59:59Z'))?.at).toBe('2027-12-31T23:00:00Z');
  });

  it('never asks for more than the API allows (92 days)', () => {
    for (let ms = Date.parse('2026-01-01T00:00:00Z'); ms < Date.parse('2028-01-01T00:00:00Z'); ms += 7 * 3_600_000) {
      const range = widgetRange(ms);
      if (!range) throw new Error(`no range at ${ms}`);
      expect(Date.parse(range.to) - Date.parse(range.from)).toBeLessThanOrEqual(92 * 24 * 3_600_000);
    }
  });
});

describe('site hours', () => {
  const range = widgetRange(Date.parse('2026-11-23T18:00:00Z'));
  if (!range) throw new Error('no range');

  it('asks the site route for the range and the hour', () => {
    expect(hoursUrl('/api/v1/sites', 'im2-athena', range)).toBe(
      '/api/v1/sites/im2-athena?from=2026-11-01T00%3A00%3A00Z&to=2026-12-23T18%3A00%3A00Z&at=2026-11-23T18%3A00%3A00Z',
    );
  });

  it('refuses to build a URL for an id outside the allowlist', () => {
    for (const id of ['..', '.', 'a/b', 'A', '-x', 'x'.repeat(65), '%2e%2e']) {
      expect(() => hoursUrl('/api/v1/sites', id, range)).toThrow('not a site id');
    }
    expect(hoursUrl('/s', 'x'.repeat(64), range)).toContain(`/s/${'x'.repeat(64)}?`);
  });

  it('reads the hours of an API body and rejects a malformed one', () => {
    const hours = hoursOf(2, { sunEl: () => 1, earthEl: () => 2 });
    expect(parseHours({ site: {}, ephemeris: { hours } })).toEqual(hours);
    expect(parseHours({ ephemeris: { hours: [{ ...hours[0], dsn: 'mars' }] } })).toBeNull();
    expect(parseHours({ ephemeris: { hours: [{ ...hours[0], sunEl: 'up' }] } })).toBeNull();
    expect(parseHours(null)).toBeNull();
  });

  it('loads the widgets, or an error when the API fails', async () => {
    const hours = hoursOf(30 * 24, { sunEl: () => 5, earthEl: () => 5 });
    const ok = vi.fn(async () => new Response(JSON.stringify({ ephemeris: { hours } })));
    const nowMs = Date.parse('2026-11-02T05:00:00Z');
    const ready = await loadWidgets({ fetch: ok, sitesUrl: '/api/v1/sites' }, 'im2-athena', nowMs);
    expect(ready.kind).toBe('ready');
    const down = vi.fn(async () => new Response('', { status: 502 }));
    expect(await loadWidgets({ fetch: down, sitesUrl: '/api/v1/sites' }, 'x', nowMs)).toEqual({ kind: 'error' });
    const offline = vi.fn(async () => Promise.reject(new TypeError('offline')));
    expect(await loadWidgets({ fetch: offline, sitesUrl: '/s' }, 'x', nowMs)).toEqual({ kind: 'error' });
  });
});
