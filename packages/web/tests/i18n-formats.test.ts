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
 * Numbers, coordinates, dates and durations in each language (VENT-35):
 * Intl writes the numbers and the dates, the catalogue the units.
 */
import { describe, expect, it } from 'vitest';
import { formatInstant, monthLabel } from '../src/calendar/instant-format';
import { formatStatusDate } from '../src/card/site-facts';
import { formatAngle, formatCoords, formatPercent, monthName, monthYear } from '../src/i18n/format';
import { fill } from '../src/i18n/translate';
import { formatAtLeast, formatDuration, formatElevation, formatShare, formatSpan } from '../src/phone/format';
import { EN, i18nOf } from './i18n-factories';

const AT = Date.parse('2026-11-23T18:20:00Z');
const es = i18nOf('es');
const fr = i18nOf('fr');
const de = i18nOf('de');
const it_ = i18nOf('it');

describe('fill', () => {
  it('fills known placeholders and keeps unknown ones', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
    expect(fill('no placeholders')).toBe('no placeholders');
  });
});

describe('coordinates', () => {
  it('writes the decimal comma and the compass of each language', () => {
    expect(formatCoords(EN, -84.7906, 29.1957)).toBe('84.79° S, 29.20° E');
    expect(formatCoords(es, -84.7906, 29.1957)).toBe('84,79° S, 29,20° E');
    expect(formatCoords(es, 26.13, 300)).toBe('26,13° N, 60,00° O');
    expect(formatCoords(de, -84.7906, 29.1957)).toBe('84,79° S, 29,20° O');
    expect(formatAngle(it_, 270, 'lon', 0)).toBe('90° O');
  });
});

describe('numbers and shares', () => {
  it('writes percents and the month share', () => {
    expect(formatPercent(EN, 47.4)).toBe('47 %');
    expect(formatPercent(it_, 47.4)).toBe('47%');
    expect(formatShare(es, 47, monthName(es, AT))).toBe('47 % de noviembre');
    expect(formatShare(fr, 47, monthName(fr, AT))).toBe('47 % en novembre');
    expect(formatShare(de, 47, monthName(de, AT))).toBe('47 % im November');
  });

  it('writes elevations with one decimal', () => {
    expect(formatElevation(EN, 'sun', 6.42)).toBe('Sun 6.4° up');
    expect(formatElevation(es, 'earth', -2)).toBe('Tierra 2,0° bajo el horizonte');
  });
});

describe('durations', () => {
  it('writes days and hours with each language’s units', () => {
    expect(formatDuration(EN, 169)).toBe('7 d 1 h');
    expect(formatDuration(fr, 169)).toBe('7 j 1 h');
    expect(formatDuration(de, 169)).toBe('7 Tg. 1 Std.');
    expect(formatDuration(it_, 72)).toBe('3 g');
    expect(formatAtLeast(es, 173)).toBe('al menos 7 d');
  });

  it('marks a span that runs on', () => {
    expect(formatSpan(EN, 800, true)).toBe('33+ d');
    expect(formatSpan(fr, 5)).toBe('5 h');
  });
});

describe('dates', () => {
  it('writes the instant with the weekday and month of each language', () => {
    expect(formatInstant(EN, AT)).toBe('Mon 23 Nov · 18:00 UTC');
    expect(formatInstant(es, AT)).toMatch(/^lun,? 23 nov · 18:00 UTC$/);
    expect(formatInstant(de, AT)).toMatch(/^Mo\.?,? 23\. Nov\.? · 18:00 UTC$/);
  });

  it('capitalises a month heading and keeps running text lower case', () => {
    expect(monthLabel(EN, AT)).toBe('November 2026');
    expect(monthLabel(es, AT)).toBe('Noviembre de 2026');
    expect(monthYear(es, AT)).toBe('noviembre de 2026');
    expect(monthLabel(it_, AT)).toBe('Novembre 2026');
  });

  it('writes a status day by locale', () => {
    expect(formatStatusDate(EN, '2025-03-06')).toBe('6 Mar 2025');
    expect(formatStatusDate(de, '2025-03-06')).toBe('6. März 2025');
    expect(formatStatusDate(es, 'NET Q1 2027 (launch)')).toBe('lanzamiento no antes del primer trimestre de 2027');
  });
});
