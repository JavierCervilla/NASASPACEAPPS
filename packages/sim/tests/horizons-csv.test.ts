import { describe, expect, it } from 'vitest';
import { HorizonsParseError, horizonsDateToIso, parseHorizonsTable } from '../src/horizons-csv.ts';
import { fixtureResult } from './fixtures.ts';

const table = (rows: string): string => `header\n$$SOE\n${rows}\n$$EOE\nfooter`;

describe('horizonsDateToIso', () => {
  it('converts a Horizons calendar date to ISO 8601 UTC', () => {
    expect(horizonsDateToIso('2026-Nov-01 00:00')).toBe('2026-11-01T00:00:00Z');
    expect(horizonsDateToIso(' 2026-Dec-31 23:00:30')).toBe('2026-12-31T23:00:30Z');
  });

  it('rejects an unknown month or shape', () => {
    expect(() => horizonsDateToIso('2026-Foo-01 00:00')).toThrow(HorizonsParseError);
    expect(() => horizonsDateToIso('2026-11-01')).toThrow(HorizonsParseError);
  });
});

describe('parseHorizonsTable', () => {
  it('reads date, azimuth and elevation, with blank or set flag columns', () => {
    const rows = parseHorizonsTable(
      table(' 2026-Nov-01 00:00,*,i, 285.117929,     1.587011,\n 2026-Nov-01 01:00, , , 84.141720,   -28.954290,'),
    );
    expect(rows).toEqual([
      { t: '2026-11-01T00:00:00Z', azimuth: 285.117929, elevation: 1.587011 },
      { t: '2026-11-01T01:00:00Z', azimuth: 84.14172, elevation: -28.95429 },
    ]);
  });

  it('fails without the $$SOE..$$EOE markers', () => {
    expect(() => parseHorizonsTable('No ephemeris for target')).toThrow(HorizonsParseError);
  });

  it('fails on a row whose numbers are not readable', () => {
    expect(() => parseHorizonsTable(table(' 2026-Nov-01 00:00,*,i, n.a., 1.5,'))).toThrow(/azimuth/);
    expect(() => parseHorizonsTable(table(' 2026-Nov-01 00:00,*,i, 1.5,'))).toThrow(/elevation/);
  });

  it('reads a whole recorded month: one row per hour of November 2026', () => {
    const rows = parseHorizonsTable(fixtureResult('sun-from-moon-s89.5-e0-2026-11.json'));
    expect(rows).toHaveLength(30 * 24);
    expect(rows[0]).toEqual({ t: '2026-11-01T00:00:00Z', azimuth: 285.117929, elevation: 1.587011 });
    expect(rows.at(-1)?.t).toBe('2026-11-30T23:00:00Z');
  });
});
