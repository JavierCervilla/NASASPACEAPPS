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

import { HOUR_MS } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { catalogueOf, translator } from '../src/i18n/catalogue';
import { liveAnswer } from '../src/live/answer';
import { cardText } from '../src/live/card-text';
import { hoursText, msText } from '../src/live/duration';
import { monthBars, runsOf } from '../src/live/month';
import { monthWords, shareOf } from '../src/live/month-text';
import { appHashTarget } from '../src/live/app-hash';

// The canvas instant (VENT-34, VENT-7): an open window at IM-2, Robledo listening, the Moon at 52° over Madrid.
const WINDOW = Date.parse('2026-11-22T20:00:00Z');
// The lunar night the app shows on 9 Nov: Sun 2.9° and Earth 2.1° under the level.
const NIGHT = Date.parse('2026-11-09T21:00:00Z');
const t = translator(catalogueOf('en'));

describe('the live answer at IM-2 (VENT-109)', () => {
  it('opens the window on 22 Nov 2026 at 20:00 UTC, Robledo listening, as the app does', () => {
    const answer = liveAnswer(WINDOW);
    expect(answer.window).toBe(true);
    expect(answer.hour.sunEl).toBeCloseTo(6.7, 0);
    expect(answer.hour.earthEl).toBeCloseTo(10.2, 0);
    expect(answer.dsn).toBe('madrid');
    // The app's card: «Sunset in 8 d 1 h», «Earthset in 8 d 8 h»: the window closes with the Sun.
    expect(answer.changeInH).toBeGreaterThanOrEqual(8 * 24);
    expect(answer.changeInH).toBeLessThanOrEqual(8 * 24 + 2);
  });

  it('says no window in the night of 9 Nov, and when it opens', () => {
    const answer = liveAnswer(NIGHT);
    expect(answer.window).toBe(false);
    expect(answer.hour.sunEl).toBeLessThan(0);
    expect(answer.changeInH).toBeGreaterThan(5 * 24);
  });

  it('writes the card in words, the window and the antenna named', () => {
    const text = cardText(liveAnswer(WINDOW), t, 'en');
    expect(text.verdict).toBe('Landing window');
    expect(text.sun).toBe('6.7° up');
    expect(text.left).toMatch(/^8 d( \d+ h)? left$/);
    expect(text.listening).toMatch(/^Listening on Earth: Robledo de Chavela · ~\d+ h$/);
    expect(text.when).toContain('20:00');
  });

  it('writes the night as the app does: below the horizon, opening later', () => {
    const text = cardText(liveAnswer(NIGHT), t, 'en');
    expect(text.sun).toBe('2.9° below the horizon');
    expect(text.earth).toBe('2.1° below the horizon');
    expect(text.verdict).toBe('No window');
    expect(text.left).toMatch(/^opens in \d+ d/);
  });

  it('speaks each language through its catalogue and Intl', () => {
    const es = cardText(liveAnswer(WINDOW), translator(catalogueOf('es')), 'es');
    expect(es.sun).toBe('6,7° sobre el horizonte');
    expect(es.verdict).toBe('Ventana de aterrizaje');
  });
});

describe('the month strip', () => {
  it('cuts runs where the test changes, each hour a share of the month', () => {
    const hours = [5, 5, -1, 5].map((sunEl, i) => ({
      t: `2026-11-01T0${i}:00:00Z`,
      sunEl,
      sunAz: 0,
      earthEl: 0,
      earthAz: 0,
      dsn: null,
    }));
    expect(runsOf(hours, (h) => h.sunEl > 0)).toEqual([
      { from: 0, to: 0.5 },
      { from: 0.75, to: 1 },
    ]);
  });

  it('draws November 2026 at IM-2 with the window in its second half', () => {
    const bars = monthBars(WINDOW);
    expect(bars.monthStartMs).toBe(Date.parse('2026-11-01T00:00:00Z'));
    expect(bars.now).toBeCloseTo((21 * 24 + 20) / (30 * 24), 5);
    expect(bars.windowShare).toBeGreaterThan(0.4);
    expect(bars.windowShare).toBeLessThan(0.55);
    expect(shareOf(bars.window)).toBeCloseTo(bars.windowShare, 5);
    expect(bars.window.some((r) => r.from <= bars.now && bars.now < r.to)).toBe(true);
  });

  it('names the month and its share in words', () => {
    const words = monthWords(monthBars(WINDOW), t, 'en');
    expect(words.title).toBe('November 2026 at IM-2 Athena');
    expect(words.caption).toMatch(/\d+% of this month\.$/);
  });
});

describe('durations', () => {
  it.each([
    [193, '8 d 1 h'],
    [192, '8 d'],
    [6, '6 h'],
    [0, '1 h'],
  ])('%i hours read «%s»', (hours, text) => {
    expect(hoursText(hours, t)).toBe(text);
  });

  it('reads minutes under an hour and rounds hours above it', () => {
    expect(msText(40 * 60_000, t)).toBe('40 min');
    expect(msText(5.6 * HOUR_MS, t)).toBe('6 h');
  });
});

describe('old links to the app\'s views', () => {
  it('sends a view\'s hash to the app, in the page\'s language', () => {
    expect(appHashTarget('#horizon', '/app/es/')).toBe('/app/es/#horizon');
    expect(appHashTarget('#globe', '/app/')).toBe('/app/#globe');
  });

  it('keeps any other hash on the landing', () => {
    for (const hash of ['', '#how', '#team', '#horizon2', '#/app']) {
      expect(appHashTarget(hash, '/app/'), hash).toBeNull();
    }
  });
});
