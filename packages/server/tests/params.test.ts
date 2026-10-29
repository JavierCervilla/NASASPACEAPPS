import { describe, expect, it } from 'vitest';
import { ParamError, parseEphemerisParams } from '../src/params.ts';

const NOW = Date.UTC(2026, 10, 14, 9, 41);
const OK = { lat: '-89.5', lon: '0', from: '2026-11-01', to: '2026-12-31' };

describe('parseEphemerisParams', () => {
  it('turns dates into the first and last hour of the range', () => {
    expect(parseEphemerisParams(OK, NOW)).toEqual({
      lat: -89.5,
      lonEast: 0,
      fromMs: Date.UTC(2026, 10, 1),
      toMs: Date.UTC(2026, 11, 31, 23),
      // The current hour falls in the range, so it is the reference.
      atMs: Date.UTC(2026, 10, 14, 9),
    });
  });

  it('accepts UTC instants on the hour and an explicit reference hour', () => {
    const request = parseEphemerisParams(
      { ...OK, from: '2026-11-01T06:00:00Z', to: '2026-11-02T06:00Z', at: '2026-11-01T12:00:00Z' },
      NOW,
    );
    expect(request.fromMs).toBe(Date.UTC(2026, 10, 1, 6));
    expect(request.toMs).toBe(Date.UTC(2026, 10, 2, 6));
    expect(request.atMs).toBe(Date.UTC(2026, 10, 1, 12));
  });

  it('uses the start of the range as reference when now is outside it', () => {
    expect(parseEphemerisParams(OK, Date.UTC(2027, 0, 5)).atMs).toBe(Date.UTC(2026, 10, 1));
  });

  it.each([
    [{ lat: '-90.1' }, /"lat"/],
    [{ lat: undefined }, /"lat"/],
    [{ lat: 'abc' }, /"lat"/],
    [{ lon: '361' }, /"lon"/],
    [{ lon: '' }, /"lon"/],
    [{ from: '2026-11-01T06:30:00Z' }, /"from"/],
    [{ from: '2026-11-01T06:00:00+02:00' }, /"from"/],
    [{ from: 'yesterday' }, /"from"/],
    [{ to: '2026-10-01' }, /before/],
    [{ to: '2027-02-02' }, /92 days/],
    [{ at: 'soon' }, /"at"/],
  ])('rejects %o', (patch, message) => {
    expect(() => parseEphemerisParams({ ...OK, ...patch }, NOW)).toThrow(ParamError);
    expect(() => parseEphemerisParams({ ...OK, ...patch }, NOW)).toThrow(message);
  });

  it('accepts a span of exactly 92 days and the extreme coordinates', () => {
    expect(() =>
      parseEphemerisParams({ lat: '-90', lon: '-180', from: '2026-11-01T00:00:00Z', to: '2027-02-01T00:00:00Z' }, NOW),
    ).not.toThrow();
  });
});
