import { describe, expect, it } from 'vitest';
import { BODY, DSN_SITES, monthsCovering, normaliseLonEast, toHorizonsParams } from '../src/horizons/query.ts';

describe('toHorizonsParams', () => {
  it('asks for an hourly azimuth and elevation table from a lunar surface point', () => {
    const params = toHorizonsParams({
      target: BODY.sun,
      centerBody: BODY.moon,
      point: { lat: -89.5, lonEast: 0, altKm: 0 },
      start: '2026-11-01 00:00',
      stop: '2026-11-30 23:00',
    });
    expect(params).toEqual({
      format: 'json',
      COMMAND: "'10'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'coord@301'",
      COORD_TYPE: "'GEODETIC'",
      SITE_COORD: "'0,-89.5,0'",
      START_TIME: "'2026-11-01 00:00'",
      STOP_TIME: "'2026-11-30 23:00'",
      STEP_SIZE: "'1 h'",
      QUANTITIES: "'4'",
      CSV_FORMAT: "'YES'",
    });
  });

  it('puts a DSN complex on Earth with its east longitude first', () => {
    const params = toHorizonsParams({
      target: BODY.moon,
      centerBody: BODY.earth,
      point: DSN_SITES.madrid,
      start: 'a',
      stop: 'b',
    });
    expect(params['CENTER']).toBe("'coord@399'");
    expect(params['SITE_COORD']).toBe("'355.751991,40.43121,0.865'");
  });
});

describe('normaliseLonEast', () => {
  it('maps every longitude to [0, 360)', () => {
    expect(normaliseLonEast(-90)).toBe(270);
    expect(normaliseLonEast(360)).toBe(0);
    expect(normaliseLonEast(-0)).toBe(0);
    expect(normaliseLonEast(45.5)).toBe(45.5);
  });
});

describe('monthsCovering', () => {
  it('covers a range with whole calendar months, across a year end', () => {
    expect(monthsCovering(Date.UTC(2026, 11, 15), Date.UTC(2027, 1, 2))).toEqual([
      { startMs: Date.UTC(2026, 11, 1), start: '2026-12-01 00:00', stop: '2026-12-31 23:00' },
      { startMs: Date.UTC(2027, 0, 1), start: '2027-01-01 00:00', stop: '2027-01-31 23:00' },
      { startMs: Date.UTC(2027, 1, 1), start: '2027-02-01 00:00', stop: '2027-02-28 23:00' },
    ]);
  });

  it('returns one month for a range inside it', () => {
    expect(monthsCovering(Date.UTC(2026, 10, 3), Date.UTC(2026, 10, 4))).toHaveLength(1);
  });
});
