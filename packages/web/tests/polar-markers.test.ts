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
 * The polar map's markers (polar/polar-markers.ts), which of their labels show (polar/label-layout.ts) and the
 * numbers of those that do not (polar/badge-layout.ts).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { numberBadges } from '../src/polar/badge-layout';
import { labelBox, visibleLabels } from '../src/polar/label-layout';
import { toPx } from '../src/polar/layout-geometry';
import { markerOf, polarMarkers } from '../src/polar/polar-markers';
import type { PhoneSite } from '../src/phone/phone-site';

const site = (id: string, lat: number, lonEast: number, extra: Partial<PhoneSite> = {}): PhoneSite => ({
  id,
  name: `${id} place`,
  mission: id.toUpperCase(),
  group: 'south_pole',
  lat,
  lonEast,
  approximate: false,
  ...extra,
});

const SITES = [
  site('im2', -84.7906, 29.1957, { name: 'Mons Mouton (IM-2 Athena)', mission: 'IM-2' }),
  site('apollo11', 0.67, 23.47, { group: 'apollo' }),
  site('nobile1', -85.2752, 53.2725, { approximate: true, name: 'Nobile Rim 1 (Artemis candidate region)', mission: 'Artemis crewed landing, a long name' }),
  site('nobile2', -85.2752, 53.2725, { approximate: true, name: 'Nobile Rim 2 (Artemis candidate region)' }),
  site('griffin', -85.2752, 53.2725, { approximate: true, name: 'Nobile region near Mons Mouton (Griffin-1, FLIP rover)' }),
  site('cy3', -69.37, 32.32),
];

/** The curated sites (server/data/sites.json): IM-2, Mons Mouton Plateau and the crowd at the pole and Shackleton. */
const CURATED = JSON.parse(readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8')) as PhoneSite[];

describe('polar markers', () => {
  const markers = polarMarkers(SITES);

  it('draws only the sites from 80° S to the pole', () => {
    expect(markers.map(({ id }) => id)).toEqual(['im2', 'nobile1']);
  });

  it('merges sites on one point into one marker, named for all and labelled with the place they share and the count', () => {
    const nobile = markerOf(markers, 'nobile2');
    expect(nobile?.id).toBe('nobile1');
    expect(nobile?.site.members.map(({ id }) => id)).toEqual(['nobile1', 'nobile2', 'griffin']);
    // Not «Nobile Rim 1 +2», and never «… near Mons Mouton», which points at another marker.
    expect(nobile?.label).toBe('Nobile · 3 sites');
    expect(nobile?.zone).toBe(true);
    // The button keeps every name.
    expect(nobile?.site.name).toContain('Nobile region near Mons Mouton (Griffin-1, FLIP rover)');
    expect(nobile?.site.name).toContain('Nobile Rim 2 (Artemis candidate region)');
  });

  it('labels merged sites with no shared place by the first place', () => {
    const [merged] = polarMarkers([
      site('a', -85, 10, { approximate: true, name: 'Haworth (Artemis candidate region)' }),
      site('b', -85, 10, { approximate: true, name: 'Shoemaker (Artemis candidate region)' }),
    ]);
    expect(merged?.label).toBe('Haworth · 2 sites');
  });

  it('labels a short mission by its mission', () => {
    expect(markerOf(markers, 'im2')?.label).toBe('IM-2');
  });

  it('has no marker for a site off the map', () => {
    expect(markerOf(markers, 'apollo11')).toBeUndefined();
  });
});

describe('polar labels', () => {
  const at = (x: number, y: number) => ({ x, y });
  const marker = (id: string, x: number, y: number, zone = false, label = 'Label') => ({ id, at: at(x, y), label, zone });

  it('converts the unit disk to px', () => {
    expect(toPx(at(0, 0), 400)).toEqual({ x: 200, y: 200 });
    expect(toPx(at(1, -1), 400)).toEqual({ x: 400, y: 0 });
  });

  it('shows every label that fits', () => {
    const shown = visibleLabels([marker('a', -0.5, -0.5), marker('b', 0.2, 0.5)], 500, null);
    expect([...shown.keys()].sort()).toEqual(['a', 'b']);
  });

  it('drops a zone label that would overlap an exact site label', () => {
    const shown = visibleLabels([marker('zone', 0, 0.01, true), marker('exact', 0, 0)], 500, null);
    expect([...shown.keys()]).toEqual(['exact']);
  });

  it('always shows the selected site, even crowded, and it claims its room first', () => {
    const shown = visibleLabels([marker('exact', 0, 0.01), marker('chosen', 0, 0, true), marker('next', 0.03, 0)], 500, 'chosen');
    expect(shown.get('chosen')).toBe('right');
    expect(shown.has('next')).toBe(false);
  });

  it('moves a label that would cover another dot to its own dot\'s left, and drops it when both sides are taken', () => {
    const shown = visibleLabels([marker('a', 0, 0), marker('b', 0.1, 0.3)], 500, null);
    expect(shown.get('a')).toBe('right');
    // b's dot sits just right of a, where a's label would go.
    const right = visibleLabels([marker('a', 0, 0), marker('b', 0.06, 0)], 500, null);
    expect(right.get('a')).toBe('left');
    // c's dot sits just left of a as well.
    const crowded = visibleLabels([marker('a', 0, 0), marker('b', 0.06, 0), marker('c', -0.06, 0)], 500, null);
    expect(crowded.has('a')).toBe(false);
  });
});

describe('polar labels near an exact site', () => {
  const at = (x: number, y: number) => ({ x, y });
  const im2 = { id: 'im2', at: at(0.3, -0.5), label: 'IM-2', zone: false };
  // Within a click of IM-2's dot, up and to its right, where IM-2's label would go.
  const plateau = { id: 'plateau', at: at(0.302, -0.502), label: 'Mons Mouton · 2 sites', zone: true };

  it('gives an exact site its label over a zone on its dot, selected or not', () => {
    expect([...visibleLabels([plateau, im2], 600, null).keys()]).toEqual(['im2']);
    expect([...visibleLabels([plateau, im2], 600, 'im2').keys()]).toEqual(['im2']);
  });

  it('still labels the zone when it is the one selected', () => {
    expect(visibleLabels([plateau, im2], 600, 'plateau').has('plateau')).toBe(true);
  });

  it('keeps a zone that is clear of every exact site', () => {
    const far = { ...plateau, at: at(-0.4, 0.4) };
    expect([...visibleLabels([far, im2], 600, null).keys()].sort()).toEqual(['im2', 'plateau']);
  });

  it('sets the selected label further from its larger dot', () => {
    const plain = labelBox(im2, 600, false);
    const chosen = labelBox(im2, 600, true);
    const dot = toPx(im2.at, 600);
    // The selected dot is 14 px with a 4 px ring: 11 px from its centre.
    expect(plain.left - dot.x).toBe(10);
    expect(chosen.left - dot.x).toBeGreaterThanOrEqual(11 + 6);
  });
});

describe('polar number badges', () => {
  const at = (x: number, y: number) => ({ x, y });
  const marker = (id: string, x: number, y: number, label = id) => ({ id, at: at(x, y), label, zone: true });

  it('numbers every marker without a label, in reading order, and none with one', () => {
    const markers = [marker('c', 0.1, 0.2), marker('a', -0.2, -0.3), marker('shown', 0.5, 0.5), marker('b', 0.3, -0.3)];
    const badges = numberBadges(markers, 600, new Map([['shown', 'right']]), null);
    expect(badges.map(({ id, n }) => [id, n])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    expect(badges.map(({ label }) => label)).toEqual(['a', 'b', 'c']);
  });

  it('moves a badge to a free corner when the first would cover a neighbour', () => {
    // b's dot sits up and to the right of a's, where a's badge would go first.
    const badges = numberBadges([marker('a', 0, 0), marker('b', 0.04, -0.04)], 600, new Map(), null);
    const a = badges.find(({ id }) => id === 'a');
    expect(a?.corner).not.toBe('ne');
  });

  it('steps a badge out past a selected dot\'s ring when every near corner is taken (IM-2 and its plateau)', () => {
    const im2 = { id: 'im2', at: at(0, 0), label: 'IM-2', zone: false };
    // 1 px from IM-2's dot: every near corner lies on IM-2's larger dot or its label.
    const plateau = marker('plateau', 0.0033, -0.0033);
    const shown = visibleLabels([im2, plateau], 600, 'im2');
    expect([...numberBadges([im2, plateau], 600, shown, 'im2')]).toEqual([
      { id: 'plateau', n: 1, corner: 'ne', reach: 'far', label: 'plateau' },
    ]);
  });

  it('keeps a badge off a label that shows', () => {
    // The shown label runs right from its dot, through where a's first corner would put the badge.
    const label = { ...marker('shown', -0.06, -0.06), label: 'A long label' };
    const badges = numberBadges([label, marker('a', 0, 0)], 600, new Map([['shown', 'right']]), null);
    expect(badges[0]?.corner).not.toBe('ne');
  });

  for (const selected of [null, 'im2-athena']) {
    it(`identifies every curated marker at the map's smallest size, ${selected ?? 'none'} selected`, () => {
      const markers = polarMarkers(CURATED);
      const shown = visibleLabels(markers, 320, selected);
      const badges = numberBadges(markers, 320, shown, selected);
      // A label or a number for every marker, and the landed IM-2 keeps its own label.
      for (const { id } of markers) expect(shown.has(id) || badges.some((b) => b.id === id)).toBe(true);
      expect(shown.has('im2-athena')).toBe(true);
      expect(shown.has('artemis-mons-mouton-plateau')).toBe(false);
      expect(badges.map(({ label }) => label)).toEqual(expect.arrayContaining(['Shackleton connecting ridge', 'Mons Mouton · 2 sites']));
    });
  }
});
