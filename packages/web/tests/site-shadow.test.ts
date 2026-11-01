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

import { shadowedHours, type HourSample, type SiteShadow } from '@ventana/sim';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { captionLine, shadowNote } from '../src/card/shadow-note';
import { toPhoneSite } from '../src/phone/phone-site';
import { bodyWidget, EARTH, SUN } from '../src/phone/body-widget';
import { nowState } from '../src/phone/now-widget';
import { shadowedComputed, shadowedLoader, shadowsOf } from '../src/source/shadowed-hours';
import { halfLiftPx } from '../src/sheet/sheet-lift';
import { EN, i18nOf } from './i18n-factories';
import { hoursOf, upUntil } from './phone-factories';

const SOURCE = { label: 'NASA PGDA', url: 'https://pgda.gsfc.nasa.gov/products/69' };
const PSR: SiteShadow = { kind: 'psr', avgSun: 0, source: SOURCE };
// Cabeus B's share in AVGVISIB_75S_120M (packages/sim/data/psr-flags.json).
const DIM: SiteShadow = { kind: 'dimFloor', avgSun: 0.1078, source: SOURCE };
const RANGE = { from: '2026-11-01T00:00:00Z', to: '2026-11-01T03:00:00Z' };
const SITES = [{ id: 'haworth', shadow: PSR }, { id: 'cabeus', shadow: DIM }, { id: 'im2' }];
// Sun and Earth up for two hours, then both down.
const HOURS: HourSample[] = hoursOf(4, { sunEl: upUntil(2), earthEl: upUntil(2) });

describe('shadowNote', () => {
  it('says a point in permanent shadow is not a landing point, short where the precision line says it', () => {
    expect(shadowNote(EN, PSR)).toEqual({
      kind: 'psr',
      title: 'Permanent shadow · not a landing point',
      body: "NASA's maps put this point on a crater floor the Sun never reaches.",
    });
    expect(shadowNote(EN, PSR, true)?.title).toBe('Permanent shadow');
  });

  it("gives a dim floor the map's share of Sun, written by Intl", () => {
    expect(shadowNote(EN, DIM)).toEqual({
      kind: 'dimFloor',
      title: 'Crater floor · little Sun',
      body: "NASA's maps give this point 11 % of the Sun on average.",
    });
    expect(shadowNote(i18nOf('es'), DIM)?.body).toContain('11');
  });

  it('is nothing for an unmarked site', () => {
    expect(shadowNote(EN, undefined)).toBeNull();
  });
});

describe('captionLine', () => {
  const SUN_SOURCE = "Sun from NASA's permanent-shadow map (LRO LOLA, Mazarico 2011)";

  it("joins the Sun's source to the computed caption on one line in permanent shadow", () => {
    expect(captionLine(EN, 'Computed', PSR)).toBe(`Computed · ${SUN_SOURCE}`);
    expect(captionLine(EN, null, PSR)).toBe(SUN_SOURCE);
  });

  it('keeps the computed caption alone elsewhere, and nothing without one', () => {
    expect(captionLine(EN, 'Computed', DIM)).toBe('Computed');
    expect(captionLine(EN, null, undefined)).toBeNull();
  });
});

describe('a site in permanent shadow', () => {
  const dark = shadowedHours(HOURS, PSR);

  it('shows no Sun in the Sun widget, and the Earth as it is', () => {
    expect(bodyWidget(SUN, dark, dark[0]!, EN)).toEqual({
      label: 'Sun', value: 'No Sun', detail: 'Permanent shadow',
    });
    expect(bodyWidget(EARTH, dark, dark[0]!, EN)).toEqual(bodyWidget(EARTH, HOURS, HOURS[0]!, EN));
  });

  it('is «Earth only» or «Neither», never a window', () => {
    expect(dark.map(nowState)).toEqual(['earth', 'earth', 'none', 'none']);
  });

  it('keeps its shadow in the slim site the page passes, and an unmarked site gets none', () => {
    const site = { id: 'h', name: 'H', mission: 'M', group: 'south_pole', lat: -87, lonEast: 5, approximate: true } as const;
    expect(toPhoneSite({ ...site, shadow: PSR }).shadow).toBe(PSR);
    expect('shadow' in toPhoneSite(site)).toBe(false);
  });
});

describe('shadowed loaders', () => {
  const shadowOf = shadowsOf(SITES);

  it('hides the Sun in the computed hours of a site in permanent shadow only, once per array', () => {
    const load = shadowedComputed(() => HOURS, shadowOf);
    const dark = load('haworth', RANGE);
    expect(dark?.every((hour) => hour.sunHidden === true)).toBe(true);
    expect(load('haworth', RANGE)).toBe(dark);
    expect(load('cabeus', RANGE)).toBe(HOURS);
    expect(load('im2', RANGE)).toBe(HOURS);
    expect(shadowedComputed(() => null, shadowOf)('haworth', RANGE)).toBeNull();
  });

  it("hides the Sun in the API's hours of a site in permanent shadow", async () => {
    const load = shadowedLoader(() => Promise.resolve(HOURS), shadowOf);
    expect((await load('haworth', RANGE)).every((hour) => hour.sunHidden === true)).toBe(true);
    expect(await load('im2', RANGE)).toEqual(HOURS);
  });

  it('passes a failure through', async () => {
    const load = shadowedLoader(() => Promise.reject(new Error('down')), shadowOf);
    await expect(load('haworth', RANGE)).rejects.toThrow('down');
  });
});

describe('halfLiftPx', () => {
  afterEach(() => vi.unstubAllGlobals());

  const sheetWith = (lift: object | null) =>
    ({ querySelector: () => lift }) as unknown as HTMLElement;

  it("is the note's height and the gap before it", () => {
    vi.stubGlobal('getComputedStyle', () => ({ rowGap: '12px' }));
    const note = { parentElement: {}, getBoundingClientRect: () => ({ height: 54 }) };
    expect(halfLiftPx(sheetWith(note))).toBe(66);
  });

  it('is 0 without a note', () => {
    expect(halfLiftPx(sheetWith(null))).toBe(0);
  });
});
