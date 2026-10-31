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

/** The globe's site callout (src/callout/*): its content per state, where it docks, and the no-image case. */
import type { HourSample } from '@ventana/sim';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calloutContent } from '../src/callout/callout-content';
import { DESKTOP_GAP_PX, dockCallout, fitCallout, PHONE_GAP_PX, type CalloutFit, type CalloutLayout } from '../src/callout/callout-dock';
import { missionLines } from '../src/callout/mission-line';
import { PHONE_MISSION_CHARS, PHONE_PLACE_CHARS, placeShort } from '../src/callout/phone-lines';
import { thumbOf } from '../src/callout/thumbs';
import type { CardSite } from '../src/card/site-facts';
import { SiteCallout } from '../src/globe/site-callout';
import type { HoursResult } from '../src/phone/widgets-loader';
import { siteLabels } from '../src/phone/phone-site';
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

  it('gives the phone shorter lines: the mission\'s name and date, the coordinates alone', () => {
    const im2 = content(IM2, READY, 150);
    expect(im2.missionShort).toBe('IM-2 · 6 Mar 2025');
    expect(im2.placeShort).toBe('Mons Mouton');
    expect(im2.pointShort).toBe('84.79° S · 29.20° E');
    const planned = content({ ...IM2, status: 'planned', statusDate: 'NET 2027' }, READY, 150);
    expect(planned.missionShort).toBe('IM-2 · NET 2027');
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

  it('tells pending hours from failed ones: a clock not yet running and a loading month are pending', () => {
    expect(content(IM2, { kind: 'loading' }, 150).hours).toBe('pending');
    expect(content(IM2, READY, null).hours).toBe('pending');
    expect(content(IM2, { kind: 'error' }, 150).hours).toBe('error');
    expect(content(IM2, { kind: 'outside' }, 150).hours).toBe('outside');
    expect(content(IM2, READY, 150).hours).toBe('ready');
  });

  it('shows the LOLA thumbnail of a south pole site, with its frame and an alt text', () => {
    expect(content(IM2, READY, 150).image).toEqual({
      src: '/thumbs/im2-athena.jpg',
      srcset: '/thumbs/im2-athena.jpg 320w, /thumbs/im2-athena@2x.jpg 640w',
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

/** Every curated site, as the page gets it from the server's list. */
const SITES: Required<CardSite>[] = JSON.parse(
  readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8'),
);

describe('callout mission line', () => {
  /** Mission lines longer than this no longer read at a glance (two lines of the desktop card). */
  const MAX_CHARS = 60;
  const lines = SITES.map((site) => ({ id: site.id, ...missionLines(site, siteLabels(site).subtitle) }));

  it.each(lines.flatMap(({ id, wide, short }) => [[id, 'wide', wide], [id, 'short', short]]))(
    '%s (%s): «%s» says each thing once, at a sane length',
    (_id, _form, line) => {
      const segments = line.split(' · ');
      expect(segments.every(Boolean)).toBe(true);
      for (const [i, segment] of segments.entries()) {
        const others = segments.filter((_, j) => j !== i).map((s) => s.toLowerCase());
        expect(others.some((other) => other.includes(segment.toLowerCase())), segment).toBe(false);
      }
      const years = line.match(/\b\d{4}\b/g) ?? [];
      expect(new Set(years).size).toBe(years.length);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    },
  );

  it.each([
    ['artemis-haworth', 'Artemis candidate region · landing planned 2028', 'Artemis · 2028'],
    ['artemis-slater-plain', 'Artemis candidate region · landing planned 2028', 'Artemis · 2028'],
    ['change7-target', "Chang'e-7 target · planned · 2027 (launch NET)", "Chang'e-7 · 2027"],
    ['im2-athena', 'IM-2 Athena · landed 6 Mar 2025', 'IM-2 · 6 Mar 2025'],
    ['chandrayaan3-vikram', 'Chandrayaan-3 Vikram · landed 23 Aug 2023', 'Chandrayaan-3 · Aug 2023'],
    ['luna25-target', 'north of Boguslawsky · crashed 19 Aug 2023', 'Luna-25 · crashed Aug 2023'],
    ['bluemoon-mk1-pathfinder', 'Blue Moon MK1 Pathfinder · planned · NET Q1 2027 (launch)', 'Blue Moon · NET Q1 2027'],
    ['griffin1-nobile', 'Griffin-1, FLIP rover · planned · landing TBA', 'Griffin-1 · landing TBA'],
    ['ispace-m2-resilience', 'ispace M2 Resilience, crashed · 5 Jun 2025', 'ispace · crashed Jun 2025'],
  ])('%s reads «%s» on a desktop and «%s» on a phone', (id, wide, short) => {
    expect(lines.find((line) => line.id === id)).toMatchObject({ wide, short });
  });
});

describe('phone compact callout lines', () => {
  // The budgets fit the card's 196 px text column at 360 px and up, measured in Chromium: the widest real mission
  // line, «Chandrayaan-3 · 23 Aug 2023» (27 characters, so it drops its day), is 185 px; the widest place,
  // «Mons Mouton Plateau», 174 px.
  const rows = SITES.map((site) => {
    const { title, subtitle } = siteLabels(site);
    return { id: site.id, mission: missionLines(site, subtitle).short, place: placeShort(title) };
  });

  it.each(rows.map((row) => [row.id, row.mission, row.place] as const))(
    '%s reads «%s» and «%s» on a phone, each inside its budget',
    (_id, mission, place) => {
      expect(mission.length).toBeLessThanOrEqual(PHONE_MISSION_CHARS);
      expect(place.length).toBeLessThanOrEqual(PHONE_PLACE_CHARS);
      // Each still says something: a name, and the date when the list gives one.
      expect(mission.split(' · ').every(Boolean)).toBe(true);
      expect(place).not.toBe('');
    },
  );

  it.each([
    ['Shackleton connecting ridge', 'Shackleton ridge'],
    ['Nobile region near Mons Mouton', 'Nobile region'],
    ['Mare Tranquillitatis (Tranquility Base)', 'Mare Tranquillitatis'],
    ['Mons Rümker area, Oceanus Procellarum', 'Mons Rümker area'],
    ['Mons Mouton Plateau', 'Mons Mouton Plateau'],
    ['Peak near Cabeus B', 'Peak near Cabeus B'],
  ])('shortens the place «%s» to «%s»', (place, short) => {
    expect(placeShort(place)).toBe(short);
  });
});

/** The 390x844 phone of the canvas: the top bar's bottom at 70, the tab bar's top at 761, a 104 px compact card. */
const PHONE: CalloutLayout = {
  phone: true,
  hostWidth: 390,
  hostHeight: 844,
  cardWidth: 312,
  cardHeight: 104,
  sheetTop: Number.POSITIVE_INFINITY,
  tabsTop: 761,
  barBottom: 70,
  layers: null,
};
/** The 1440x900 desktop: a 1392 x 640 globe, the Layers key at its bottom left, a 284 px image card. */
const LAYERS = { left: 20, top: 560, right: 380, bottom: 620 };
const DESKTOP: CalloutLayout = { ...PHONE, phone: false, hostWidth: 1392, hostHeight: 640, cardWidth: 264, cardHeight: 284, tabsTop: Number.POSITIVE_INFINITY, barBottom: 0, layers: LAYERS };

describe('callout dock', () => {
  it('on a phone sits 12 px off the left edge, its bottom 12 px above the sheet\'s top edge', () => {
    expect(dockCallout({ ...PHONE, sheetTop: 500 })).toEqual({ left: PHONE_GAP_PX, bottom: 500 - PHONE_GAP_PX });
    expect(dockCallout({ ...PHONE, sheetTop: 687.5 })).toEqual({ left: 12, bottom: 675.5 });
  });

  it('on a phone with the sheet closed (below the screen), or lower than the tab bar, stands 12 px above the tab bar', () => {
    expect(dockCallout({ ...PHONE, sheetTop: 900 })).toEqual({ left: 12, bottom: 761 - 12 });
    expect(dockCallout(PHONE)).toEqual({ left: 12, bottom: 749 });
  });

  it('hides at full height, where it would reach the top bar, and stays at half on a short 390x664 screen', () => {
    expect(dockCallout({ ...PHONE, sheetTop: 96 })).toBeNull();
    // The last edge that keeps 12 px between the card and the top bar, and one px above it.
    expect(dockCallout({ ...PHONE, sheetTop: 70 + 12 + 104 + 12 })).not.toBeNull();
    expect(dockCallout({ ...PHONE, sheetTop: 70 + 12 + 104 + 11 })).toBeNull();
    expect(dockCallout({ ...PHONE, hostHeight: 664, tabsTop: 581, sheetTop: 664 - 344 })).toEqual({ left: 12, bottom: 308 });
  });

  it('on a desktop stands on the Layers key\'s left edge, its bottom 14 px above the key', () => {
    expect(dockCallout(DESKTOP)).toEqual({ left: 20, bottom: 560 - DESKTOP_GAP_PX });
    expect(dockCallout({ ...DESKTOP, layers: { ...LAYERS, left: 32, top: 400 } })).toEqual({ left: 32, bottom: 386 });
  });

  it('on a desktop without a drawn key takes the key\'s corner, and hides with no room above', () => {
    expect(dockCallout({ ...DESKTOP, layers: null })).toEqual({ left: 20, bottom: 620 });
    expect(dockCallout({ ...DESKTOP, layers: null, cardHeight: 612 })).toEqual({ left: 20, bottom: 620 });
    expect(dockCallout({ ...DESKTOP, layers: null, cardHeight: 613 })).toBeNull();
  });

  it('at large text, with no room above the key, hides rather than stand beside it over the globe (QA F2)', () => {
    expect(dockCallout({ ...DESKTOP, cardHeight: 538 })).toEqual({ left: 20, bottom: 546 });
    expect(dockCallout({ ...DESKTOP, cardHeight: 539 })).toBeNull();
    // 200 % text at 1280x720: a 896 x 320 globe, a 286 x 191 key and a 528 x 196 card.
    const large = { ...DESKTOP, hostWidth: 896, hostHeight: 320, cardWidth: 528, cardHeight: 196, layers: { left: 20, top: 109, right: 306, bottom: 300 } };
    expect(dockCallout(large)).toBeNull();
  });

  it('ignores the sheet on a desktop and the Layers key on a phone', () => {
    expect(dockCallout({ ...DESKTOP, sheetTop: 100 })).toEqual(dockCallout(DESKTOP));
    expect(dockCallout({ ...PHONE, layers: LAYERS })).toEqual(dockCallout(PHONE));
  });
});

describe('callout fit', () => {
  const FRESH: CalloutFit = { dock: null, compact: false, fullHeight: 0 };
  // 1280x720: a 363 px globe, the Layers key's top at 280, a 306 px image card and a 98 px compact one.
  const SHORT = { ...DESKTOP, hostHeight: 363, cardHeight: 306, layers: { left: 20, top: 280, right: 300, bottom: 343 } };

  it('keeps the image card where it fits above the key', () => {
    expect(fitCallout(DESKTOP, FRESH)).toEqual({ dock: { left: 20, bottom: 546 }, compact: false, fullHeight: 284 });
  });

  it('drops to the compact card on a short laptop window, hidden until it is measured, then docks it', () => {
    const switched = fitCallout(SHORT, FRESH);
    expect(switched).toEqual({ dock: null, compact: true, fullHeight: 306 });
    const compact = fitCallout({ ...SHORT, cardHeight: 98 }, switched);
    expect(compact).toEqual({ dock: { left: 20, bottom: 266 }, compact: true, fullHeight: 306 });
    // Still too short for the image card: it stays compact.
    expect(fitCallout({ ...SHORT, cardHeight: 98 }, compact)).toEqual(compact);
  });

  it('goes back to the image card once the window has room for it, keeping the compact dock until measured', () => {
    const compact: CalloutFit = { dock: { left: 20, bottom: 266 }, compact: true, fullHeight: 306 };
    const tall = { ...SHORT, hostHeight: 640, cardHeight: 98, layers: LAYERS };
    expect(fitCallout(tall, compact)).toEqual({ dock: { left: 20, bottom: 546 }, compact: false, fullHeight: 306 });
  });

  it('hides when even the compact card has no room (large text), and waits for a measured card', () => {
    const large = { ...DESKTOP, hostWidth: 896, hostHeight: 320, cardWidth: 528, cardHeight: 196, layers: { left: 20, top: 109, right: 306, bottom: 300 } };
    expect(fitCallout(large, { dock: null, compact: true, fullHeight: 400 }).dock).toBeNull();
    expect(fitCallout({ ...SHORT, cardHeight: 0 }, FRESH).compact).toBe(false);
  });

  it('never makes the phone card compact', () => {
    expect(fitCallout({ ...PHONE, sheetTop: 500 }, { dock: null, compact: true, fullHeight: 306 })).toEqual({ dock: { left: 12, bottom: 488 }, compact: false, fullHeight: 306 });
  });
});

/** A fake element with the inline style the callout writes its transforms to. */
class StyledElement extends FakeElement {
  readonly style: Record<string, string> = {};
  private readonly handlers = new Map<string, () => void>();
  alt = '';
  sizes = '';
  srcset = '';
  get src(): string {
    return this.getAttribute('src') ?? '';
  }
  set src(value: string) {
    this.setAttribute('src', value);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  override addEventListener(type: string, listener: () => void): void {
    this.handlers.set(type, listener);
  }
  /** Runs the listener of `type`, as the browser does when the image loads. */
  fire(type: string): void {
    this.handlers.get(type)?.();
  }
}

describe('SiteCallout', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mount = () => {
    vi.stubGlobal('document', { createElement: (tag: string) => new StyledElement(tag) });
    const callout = new SiteCallout();
    callout.layout(DESKTOP);
    const card = callout.dom.card as unknown as StyledElement;
    return { callout, card };
  };

  it('docks the content above the Layers key, anchored to the host\'s bottom, and on a phone rides the sheet\'s edge', () => {
    const { callout, card } = mount();
    expect(card.dataset['shown']).toBe('false');
    callout.show(content(IM2, READY, 150));
    expect(card.dataset['shown']).toBe('true');
    expect(card.dataset['state']).toBe('window');
    // Its bottom at 546 px from the host's top, 94 px above the host's bottom edge.
    expect(card.style['transform']).toBe('translate3d(20px, -94px, 0)');
    callout.layout(PHONE);
    callout.layout({ sheetTop: 500 });
    expect(card.style['transform']).toBe('translate3d(12px, -356px, 0)');
    // At full height it hides where it was, so it fades out in place.
    callout.layout({ sheetTop: 96 });
    expect(card.dataset['shown']).toBe('false');
    expect(card.style['transform']).toBe('translate3d(12px, -356px, 0)');
    callout.show(null);
    callout.layout({ sheetTop: 500 });
    expect(card.dataset['shown']).toBe('false');
  });

  it('gives a framed marker the band above the card when the card spans the view\'s middle, and tells its watchers (QA F1)', () => {
    const { callout } = mount();
    const heard = vi.fn();
    const stop = callout.watch(heard);
    // No content: no card, the whole host below the (absent) top bar.
    expect(callout.band()).toEqual({ top: 0, bottom: 640 });
    callout.show(content(IM2, READY, 150));
    // The desktop card stands at the left, clear of the middle: the band is the whole host.
    expect(callout.band()).toEqual({ top: 0, bottom: 640 });
    callout.layout({ ...PHONE, sheetTop: 500 });
    // The phone card spans the middle: from the top bar's bottom to the card's top, 488 - 104.
    expect(callout.band()).toEqual({ top: 70, bottom: 384 });
    callout.layout({ sheetTop: 96 });
    expect(callout.band()).toEqual({ top: 70, bottom: 844 });
    expect(heard).toHaveBeenCalledTimes(3);
    stop();
    callout.layout({ sheetTop: 500 });
    expect(heard).toHaveBeenCalledTimes(3);
  });

  it('marks pending hours for a skeleton, and says «Data unavailable», neutral, when they fail', () => {
    const { callout, card } = mount();
    callout.show(content(IM2, { kind: 'loading' }, 150));
    expect([card.dataset['hours'], card.dataset['state']]).toEqual(['pending', 'unknown']);
    expect(callout.dom.text.pill.textContent).toBe('');
    callout.show(content(IM2, { kind: 'error' }, 150));
    expect([card.dataset['hours'], card.dataset['state']]).toEqual(['error', 'unknown']);
    expect(callout.dom.text.pill.textContent).toBe('Data unavailable');
    expect(callout.dom.text.badge.textContent).toBe('Data unavailable');
    callout.show(content(IM2, READY, 150));
    expect(callout.dom.text.pill.textContent).toBe('Landing window · 2 d 2 h left');
  });

  it('hides the old image when the site changes until the new one has loaded, with a 2x file for 2x screens', () => {
    const { callout, card } = mount();
    const img = callout.dom.img as unknown as StyledElement;
    callout.show(content(IM2, READY, 150));
    expect(card.dataset['imageReady']).toBe('false');
    expect(img.srcset).toBe('/thumbs/im2-athena.jpg 320w, /thumbs/im2-athena@2x.jpg 640w');
    expect(img.sizes).toBe('(max-width: 767.98px) 84px, 16.5rem');
    img.fire('load');
    expect(card.dataset['imageReady']).toBe('true');
    // A new instant for the same site keeps the loaded image.
    callout.show(content(IM2, READY, 250));
    expect(card.dataset['imageReady']).toBe('true');
    callout.show(content({ ...IM2, id: 'im1-odysseus', name: 'Malapert A region (IM-1 Odysseus)' }, READY, 150));
    expect(card.dataset['imageReady']).toBe('false');
    expect(img.src).toBe('/thumbs/im1-odysseus.jpg');
  });

  it('marks a site without an image, and shows it whatever its marker does', () => {
    const { callout, card } = mount();
    callout.show(content(APOLLO11, READY, 150));
    expect(card.dataset['shown']).toBe('true');
    expect(card.dataset['image']).toBe('none');
    expect(callout.dom.img.getAttribute('src')).toBeNull();
  });
});
