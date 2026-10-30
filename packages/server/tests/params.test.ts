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

import { describe, expect, it } from 'vitest';
import { ParamError, parseEphemerisParams, roundToGrid } from '../src/params.ts';

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

  it('rejects a reference hour outside the range', () => {
    expect(() => parseEphemerisParams({ ...OK, at: '2026-10-31T23:00:00Z' }, NOW)).toThrow(/"at" must fall between "from" and "to"/);
    expect(() => parseEphemerisParams({ ...OK, at: '2027-01-01' }, NOW)).toThrow(ParamError);
    expect(parseEphemerisParams({ ...OK, at: '2026-12-31T23:00:00Z' }, NOW).atMs).toBe(Date.UTC(2026, 11, 31, 23));
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
    [{ from: '2025-12-31', to: '2026-01-02' }, /between 2026-01-01 and 2027-12-31/],
    [{ from: '2027-12-31', to: '2028-01-01' }, /between 2026-01-01 and 2027-12-31/],
    [{ from: '2027-12-31T00:00:00Z', to: '2028-01-01T00:00:00Z' }, /between/],
  ])('rejects %o', (patch, message) => {
    expect(() => parseEphemerisParams({ ...OK, ...patch }, NOW)).toThrow(ParamError);
    expect(() => parseEphemerisParams({ ...OK, ...patch }, NOW)).toThrow(message);
  });

  it('accepts the first and the last hour of the supported window', () => {
    const first = parseEphemerisParams({ ...OK, from: '2026-01-01', to: '2026-01-01' }, NOW);
    expect(first.fromMs).toBe(Date.UTC(2026, 0, 1));
    const last = parseEphemerisParams({ ...OK, from: '2027-12-31', to: '2027-12-31' }, NOW);
    expect(last.toMs).toBe(Date.UTC(2027, 11, 31, 23));
  });

  it('rounds the point to the 0.01 degree grid, so nearby points share one Horizons query', () => {
    const a = parseEphemerisParams({ ...OK, lat: '-84.7906', lon: '29.1957' }, NOW);
    const b = parseEphemerisParams({ ...OK, lat: '-84.79499', lon: '29.20444' }, NOW);
    expect([a.lat, a.lonEast]).toEqual([-84.79, 29.2]);
    expect([b.lat, b.lonEast]).toEqual([-84.79, 29.2]);
    expect(roundToGrid(-0.004)).toBe(0);
    expect(Object.is(roundToGrid(-0.004), -0)).toBe(false);
    expect(roundToGrid(359.996)).toBe(360);
  });

  it('accepts a span of exactly 92 days and the extreme coordinates', () => {
    expect(() =>
      parseEphemerisParams({ lat: '-90', lon: '-180', from: '2026-11-01T00:00:00Z', to: '2027-02-01T00:00:00Z' }, NOW),
    ).not.toThrow();
  });
});
