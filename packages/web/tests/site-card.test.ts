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

/** The desktop site card's text and states (card/*.ts), and the month hours it shares with the calendar strip. */
import type { HourSample } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { monthSamples } from '../src/calendar/month-samples';
import { monthFacts } from '../src/card/month-facts';
import { siteCard, sourceLine } from '../src/card/site-card';
import { formatStatusDate, missionLine, pointLine, toCardSite, type CardSite } from '../src/card/site-facts';
import { unlistedSite } from '../src/phone/unlisted-site';
import { EN } from './i18n-factories';

const HOUR = 3_600_000;
const NOV = Date.parse('2026-11-01T00:00:00Z');
const AT = Date.parse('2026-11-23T18:00:00Z');

/** Hours from 1 November 2026, `count` of them, with the Sun and the Earth from `sky`. */
function hours(count: number, sky: (hour: number) => Pick<HourSample, 'sunEl' | 'earthEl'>): HourSample[] {
  return Array.from({ length: count }, (_, hour) => ({
    t: new Date(NOV + hour * HOUR).toISOString().replace('.000Z', 'Z'),
    sunAz: 0,
    earthAz: 0,
    dsn: null,
    ...sky(hour),
  }));
}

/** A November of 720 hours: Sun for the first 300, Earth from hour 200 on, so a window from 200 to 299. */
const NOVEMBER = hours(720 + 30 * 24, (hour) => ({
  sunEl: hour < 300 ? 5 : -5,
  earthEl: hour >= 200 ? 8 : -2,
}));

const IM2: CardSite = {
  id: 'im2-athena',
  name: 'Mons Mouton (IM-2 Athena)',
  mission: 'IM-2',
  group: 'south_pole',
  lat: -84.7906,
  lonEast: 29.1957,
  approximate: false,
  agency: 'Intuitive Machines / NASA CLPS',
  status: 'landed',
  statusDate: '2025-03-06',
};

describe('site card head', () => {
  it('writes an ISO day as on the canvas and keeps any other date as given', () => {
    expect(formatStatusDate(EN, '2025-03-06')).toBe('6 Mar 2025');
    expect(formatStatusDate(EN, 'NET Q1 2027 (launch)')).toBe('NET Q1 2027 (launch)');
  });

  it('names the agency and the landing date of a landed mission', () => {
    expect(missionLine(EN, IM2)).toBe('Intuitive Machines / NASA CLPS · landed 6 Mar 2025');
  });

  it('keeps the status and its date apart when it is not a landing', () => {
    const planned = { ...IM2, agency: 'Blue Origin', status: 'planned', statusDate: 'NET Q1 2027 (launch)' };
    expect(missionLine(EN, planned)).toBe('Blue Origin · planned · NET Q1 2027 (launch)');
  });

  it('says how exact the point is', () => {
    expect(pointLine(EN, IM2)).toBe('84.79° S, 29.20° E · exact touchdown');
    expect(pointLine(EN, { ...IM2, approximate: true, status: 'candidate region' })).toBe(
      '84.79° S, 29.20° E · approximate zone, not a landing point',
    );
    expect(pointLine(EN, { ...IM2, status: 'crashed 2025-06-05 (failed landing)' })).toContain('impact point');
    expect(pointLine(EN, { ...IM2, status: 'planned' })).toContain('published target');
  });

  it('copes with a site the build does not hold', () => {
    const unlisted = unlistedSite('new-site');
    expect(missionLine(EN, unlisted)).toBe('');
    expect(pointLine(EN, unlisted)).toBe('Coordinates not in this build');
  });

  it('keeps only what the card reads of a full site', () => {
    const full = { ...IM2, coordinateNote: 'long', sources: [] } as Required<CardSite>;
    expect(toCardSite(full)).toEqual(IM2);
  });
});

describe('month facts', () => {
  it('counts the month alone, not the 30 days after it', () => {
    expect(monthSamples(NOVEMBER, AT)).toHaveLength(720);
  });

  it('lists the shares, the longest window and the longest night', () => {
    expect(monthFacts(NOVEMBER, AT, EN)).toEqual([
      { label: 'Hours with Sun', value: '42 %' },
      { label: 'Hours with Earth', value: '72 %' },
      { label: 'Landing window', value: '14 %', tone: 'window' },
      { label: 'Longest window', value: '4 d 4 h' },
      { label: 'Longest night', value: '17 d 12 h' },
    ]);
  });

  it('says so when the month has no window and no night', () => {
    const sunny = hours(720, () => ({ sunEl: 5, earthEl: -2 }));
    const rows = monthFacts(sunny, AT, EN);
    expect(rows?.[3]).toEqual({ label: 'Longest window', value: 'None' });
    expect(rows?.[4]).toEqual({ label: 'Longest night', value: 'No night' });
  });

  it('has nothing for a month the hours do not reach', () => {
    expect(monthFacts(NOVEMBER, Date.parse('2027-03-01T00:00:00Z'), EN)).toBeNull();
  });
});

describe('site card states', () => {
  it('names the month, the source and the rules', () => {
    expect(sourceLine(EN, AT)).toBe('November 2026 · JPL Horizons, 1 h step · Sun above 0°, Earth above 3°');
  });

  it('passes loading, error and outside through', () => {
    for (const kind of ['loading', 'error', 'outside'] as const) {
      expect(siteCard({ kind }, AT, EN)).toEqual({ kind });
    }
  });

  it('is an error when the hours hold none of the instant', () => {
    expect(siteCard({ kind: 'ready', hours: [] }, AT, EN)).toEqual({ kind: 'error' });
  });

  it('shows the phone widgets’ own countdowns for the instant, and the month', () => {
    const at = NOV + 250 * HOUR;
    const card = siteCard({ kind: 'ready', hours: NOVEMBER }, at, EN);
    if (card.kind !== 'ready') throw new Error(card.kind);
    expect(card.sun).toEqual({ label: 'Sunset in', value: '2 d 2 h', detail: 'Sun 5.0° up' });
    expect(card.earth.label).toBe('Earthset in');
    expect(card.earth.value).toMatch(/^at least/);
    expect(card.rows).toHaveLength(5);
    expect(card.source).toMatch(/^November 2026 · /);
  });

  it('turns «Sunrise in» once the Sun is down', () => {
    const card = siteCard({ kind: 'ready', hours: NOVEMBER }, NOV + 400 * HOUR, EN);
    if (card.kind !== 'ready') throw new Error(card.kind);
    expect(card.sun.label).toBe('Sunrise in');
    expect(card.sun.detail).toBe('Sun 5.0° below');
  });
});
