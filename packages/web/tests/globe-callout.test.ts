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

/** The globe's site callout (src/callout/*): its content per state, its placement and flips, and the no-image case. */
import type { HourSample } from '@ventana/sim';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampInto, overlap } from '../src/callout/box';
import { calloutContent } from '../src/callout/callout-content';
import { placeCallout, type PlaceInput } from '../src/callout/callout-place';
import { thumbOf } from '../src/callout/thumbs';
import type { CardSite } from '../src/card/site-facts';
import { SiteCallout } from '../src/globe/site-callout';
import type { HoursResult } from '../src/phone/widgets-loader';
import { FakeElement } from './fake-dom';

const HOUR = 3_600_000;
const NOV = Date.parse('2026-11-01T00:00:00Z');

/**
 * Two months of hours from 1 November 2026: Sun only for the first 100, a window to 200, Earth only to 300, then
 * neither, so each state holds at a known hour and lasts a known time.
 */
const SKY: HourSample[] = Array.from({ length: 61 * 24 }, (_, hour) => ({
  t: new Date(NOV + hour * HOUR).toISOString().replace('.000Z', 'Z'),
  sunAz: 0,
  earthAz: 0,
  dsn: null,
  sunEl: hour < 200 ? 5 : -5,
  earthEl: hour >= 100 && hour < 300 ? 8 : -2,
}));
const READY: HoursResult = { kind: 'ready', hours: SKY };
const at = (hour: number): number => NOV + hour * HOUR;

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

const APOLLO11: CardSite = {
  ...IM2,
  id: 'apollo11',
  name: 'Mare Tranquillitatis (Tranquility Base) (Apollo 11)',
  mission: 'Apollo 11',
  lat: 0.67416,
  lonEast: 23.47314,
  agency: 'NASA',
  statusDate: '1969-07-20',
};

const content = (site: CardSite, hours: HoursResult, hour: number | null) =>
  calloutContent({ site, hours, atMs: hour === null ? null : at(hour), base: '/' });

describe('callout content', () => {
  it('names the mission and its landing, the place, and the point with its precision, as the site card does', () => {
    const im2 = content(IM2, READY, 150);
    expect(im2.name).toBe('Mons Mouton (IM-2 Athena)');
    expect(im2.mission).toBe('IM-2 Athena · landed 6 Mar 2025');
    expect(im2.place).toBe('Mons Mouton');
    // No-break spaces hold the coordinates and the dot together.
    expect(im2.point).toBe('84.79°\u00a0S,\u00a029.20°\u00a0E\u00a0· exact touchdown');
    expect(im2.point.replaceAll('\u00a0', ' ')).toBe('84.79° S, 29.20° E · exact touchdown');
  });

  it('gives the phone shorter lines: the landing date without «landed», the coordinates alone', () => {
    const im2 = content(IM2, READY, 150);
    expect(im2.missionShort).toBe('IM-2 Athena · 6 Mar 2025');
    expect(im2.pointShort).toBe('84.79° S · 29.20° E');
    const planned = content({ ...IM2, status: 'planned', statusDate: 'NET 2027' }, READY, 150);
    expect(planned.missionShort).toBe(planned.mission);
    const unknown = content({ ...IM2, lat: Number.NaN }, READY, 150);
    expect([unknown.point, unknown.pointShort]).toEqual(['Coordinates not in this build', 'Coordinates not in this build']);
  });

  it.each([
    [50, 'sun', 'Sun only', 'Sun only · 2 d 2 h left'],
    [150, 'window', 'Landing window now', 'Landing window · 2 d 2 h left'],
    [250, 'earth', 'Earth only', 'Earth only · 2 d 2 h left'],
    [350, 'none', 'Neither', 'Neither · at least 30 d left'],
  ])('at hour %i the state is %s: badge «%s», pill «%s»', (hour, kind, badge, pill) => {
    expect(content(IM2, READY, hour).state).toEqual({ kind, badge, pill });
  });

  it('carries the Sunset and Earthset countdowns of the widgets', () => {
    const { bodies } = content(IM2, READY, 150);
    expect(bodies?.sun).toMatchObject({ label: 'Sunset in', value: '2 d 2 h' });
    expect(bodies?.earth).toMatchObject({ label: 'Earthset in', value: '6 d 6 h' });
  });

  it('has no state or countdowns while the month loads, fails, or before the clock runs', () => {
    for (const hours of [{ kind: 'loading' }, { kind: 'error' }] as const) {
      expect(content(IM2, hours, 150)).toMatchObject({ state: null, bodies: null });
    }
    expect(content(IM2, READY, null)).toMatchObject({ state: null, bodies: null, place: 'Mons Mouton' });
  });

  it('shows the LOLA thumbnail of a south pole site, with its frame and an alt text', () => {
    expect(content(IM2, READY, 150).image).toEqual({
      src: '/thumbs/im2-athena.jpg',
      alt: 'Mons Mouton from orbit, LOLA relief',
      caption: 'LOLA · 30 km',
    });
  });

  it('has no image for a site north of 80° S, nor for one the manifest does not hold', () => {
    expect(content(APOLLO11, READY, 150).image).toBeNull();
    expect(thumbOf('constructor', 'x', '/')).toBeNull();
  });

  it('shares one file between co-located sites, frames Haworth wide, and honours a base path', () => {
    expect(thumbOf('artemis-mons-mouton', 'Mons Mouton', '/')?.src).toBe('/thumbs/artemis-mons-mouton-plateau.jpg');
    expect(thumbOf('artemis-haworth', 'Haworth', '/')?.caption).toBe('LOLA · 62 km');
    expect(thumbOf('im2-athena', 'Mons Mouton', '/ventana')?.src).toBe('/ventana/thumbs/im2-athena.jpg');
  });
});

/** A 1000 x 600 globe with a 264 x 280 card, the desktop canvas's proportions. */
const SIZE = { width: 264, height: 280 };
const AREA = { left: 8, top: 8, right: 992, bottom: 592 };
const place = (x: number, y: number, extra: Partial<PlaceInput> = {}) =>
  placeCallout({ at: { x, y }, size: SIZE, area: AREA, avoid: [], ...extra });

describe('callout placement', () => {
  it('sits above and to the right of its marker, as on the canvas, with the leader rising to its left edge', () => {
    const placed = place(500, 400);
    expect(placed?.box).toEqual({ left: 536, top: 116, right: 800, bottom: 396 });
    expect(placed?.leader.from).toEqual({ x: 500, y: 400 });
    expect(placed?.leader.length).toBeCloseTo(Math.hypot(36, 36));
    expect(placed?.leader.angleDeg).toBeCloseTo(-45);
  });

  it('flips to the left near the right edge', () => {
    const placed = place(900, 400);
    expect(placed?.box.right).toBe(864);
    expect(placed?.leader.angleDeg).toBeCloseTo(-135);
  });

  it('drops below its marker near the top edge, and flips both near the top right corner', () => {
    expect(place(500, 100)?.box).toMatchObject({ left: 536, top: 104 });
    expect(place(900, 100)?.box).toMatchObject({ right: 864, top: 104 });
  });

  it('keeps clear of what the page holds over the globe (the Layers key)', () => {
    const layers = { left: 0, top: 300, right: 420, bottom: 600 };
    const placed = place(450, 590 - 300, { avoid: [layers], area: AREA });
    expect(placed && overlap(placed.box, layers)).toBe(0);
  });

  it('stays inside a phone-sized area when no side fits: the side that spills least, slid in, above the marker', () => {
    const phone = { left: 8, top: 8, right: 382, bottom: 700 };
    const placed = placeCallout({ at: { x: 195, y: 400 }, size: { width: 312, height: 104 }, area: phone, avoid: [] });
    expect(placed?.box.left).toBeGreaterThanOrEqual(8);
    expect(placed?.box.right).toBeLessThanOrEqual(382);
    expect(placed?.box.bottom).toBe(396);
    // The leader runs straight up from the marker to the card's bottom edge.
    expect(placed?.leader.angleDeg).toBeCloseTo(-90);
    expect(placed?.leader.length).toBeCloseTo(4);
  });

  it('hides with a marker outside the visible area, as under the phone sheet', () => {
    expect(place(500, 593)).toBeNull();
    expect(place(500, 400, { area: { ...AREA, bottom: 380 } })).toBeNull();
  });

  it('slides a box into the area, keeping its size', () => {
    expect(clampInto({ left: -20, top: 10, right: 80, bottom: 60 }, AREA)).toEqual({ left: 8, top: 10, right: 108, bottom: 60 });
  });
});

/** A fake element with the inline style the callout writes its transforms to. */
class StyledElement extends FakeElement {
  readonly style: Record<string, string> = {};
  src = '';
  alt = '';
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

describe('SiteCallout', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mount = () => {
    vi.stubGlobal('document', { createElement: (tag: string) => new StyledElement(tag) });
    const callout = new SiteCallout();
    callout.layout({ width: 1000, height: 600, size: SIZE, avoid: [] });
    const card = callout.dom.card as unknown as StyledElement;
    return { callout, card };
  };

  it('shows the content next to its marker and hides when the sheet rises over the marker', () => {
    const { callout, card } = mount();
    callout.show(content(IM2, READY, 150));
    callout.follow({ x: 500, y: 400 });
    expect(card.dataset['shown']).toBe('true');
    expect(card.dataset['state']).toBe('window');
    expect(card.style['transform']).toBe('translate3d(536px, 116px, 0)');
    callout.layout({ bottom: 300 });
    expect(card.dataset['shown']).toBe('false');
    callout.layout({ bottom: Number.POSITIVE_INFINITY });
    expect(card.dataset['shown']).toBe('true');
  });

  it('hides with no marker to follow (behind the limb) and marks a site without an image', () => {
    const { callout, card } = mount();
    callout.show(content(APOLLO11, READY, 150));
    callout.follow(null);
    expect(card.dataset['shown']).toBe('false');
    expect(card.dataset['image']).toBe('none');
    expect(callout.dom.img.getAttribute('src')).toBeNull();
  });
});
