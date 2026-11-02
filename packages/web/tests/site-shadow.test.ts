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

  // At 844 px tall, the tab bar's top at 761 px: 83 px of it and under.
  const TABS = { getBoundingClientRect: () => ({ top: 761 }) } as unknown as HTMLElement;
  const box = (top: number, bottom: number) => ({ getBoundingClientRect: () => ({ top, bottom, height: bottom - top }) });

  /** A sheet whose top edge is at `top`, holding `fit` (or nothing to fit). */
  const sheetAt = (top: number, fit: object | null) =>
    ({ querySelector: () => fit, getBoundingClientRect: () => ({ top }) }) as unknown as HTMLElement;

  /** What the sheet fits: its children's boxes, and its own, scrolled by `scrollTop` (sheet-scroll.ts). */
  const fitOf = (...children: object[]) => ({ children, scrollTop: 0, ...box(0, 0) });

  it('rises until the content\'s lowest line clears the tab bar by 12 px', () => {
    vi.stubGlobal('window', { innerHeight: 844 });
    // The content ends 490 px under the sheet's top: 490 + 12 + 83 = 585 px shown, 241 over the usual 344.
    const sheet = sheetAt(300, fitOf(box(300, 400), box(410, 790), box(0, 0)));
    expect(halfLiftPx(sheet, TABS, 344)).toBe(241);
  });

  it('reads the same wherever the sheet rests: the content moves with it', () => {
    vi.stubGlobal('window', { innerHeight: 844 });
    expect(halfLiftPx(sheetAt(100, fitOf(box(110, 590))), TABS, 344)).toBe(241);
  });

  // VENT-44: a summary taller than the full sheet scrolls; its children move up, the lift it needs does not.
  it('reads the same while what it fits is scrolled', () => {
    vi.stubGlobal('window', { innerHeight: 844 });
    const scrolled = { ...fitOf(box(300 - 200, 400 - 200), box(410 - 200, 790 - 200)), scrollTop: 200 };
    expect(halfLiftPx(sheetAt(300, scrolled), TABS, 344)).toBe(241);
  });

  it('never sinks under its usual height', () => {
    vi.stubGlobal('window', { innerHeight: 844 });
    expect(halfLiftPx(sheetAt(500, fitOf(box(500, 640))), TABS, 344)).toBe(0);
  });

  it('is 0 without content to fit or without a tab bar', () => {
    vi.stubGlobal('window', { innerHeight: 844 });
    expect(halfLiftPx(sheetAt(300, null), TABS, 344)).toBe(0);
    expect(halfLiftPx(sheetAt(300, fitOf(box(300, 900))), null, 344)).toBe(0);
  });
});
