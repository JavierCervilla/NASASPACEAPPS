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

/** The polar map's markers (polar/polar-markers.ts) and which of their labels show (polar/label-layout.ts). */
import { describe, expect, it } from 'vitest';
import { visibleLabels, toPx } from '../src/polar/label-layout';
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
  site('nobile2', -85.2752, 53.2725, { approximate: true }),
  site('cy3', -69.37, 32.32),
];

describe('polar markers', () => {
  const markers = polarMarkers(SITES);

  it('draws only the sites from 80° S to the pole', () => {
    expect(markers.map(({ id }) => id)).toEqual(['im2', 'nobile1']);
  });

  it('merges sites on one point into one marker, named for all and labelled with the count', () => {
    const nobile = markerOf(markers, 'nobile2');
    expect(nobile?.id).toBe('nobile1');
    expect(nobile?.site.members.map(({ id }) => id)).toEqual(['nobile1', 'nobile2']);
    expect(nobile?.label).toBe('Nobile Rim 1 +1');
    expect(nobile?.zone).toBe(true);
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
    expect([...shown].sort()).toEqual(['a', 'b']);
  });

  it('drops a zone label that would overlap an exact site label', () => {
    const shown = visibleLabels([marker('zone', 0, 0.01, true), marker('exact', 0, 0)], 500, null);
    expect([...shown]).toEqual(['exact']);
  });

  it('always shows the selected site, even crowded, and it claims its room first', () => {
    const shown = visibleLabels([marker('exact', 0, 0.01), marker('chosen', 0, 0, true), marker('next', 0.03, 0)], 500, 'chosen');
    expect([...shown]).toEqual(['chosen']);
  });

  it('drops a label that would cover another dot', () => {
    // b's dot sits just right of a, where a's label would go.
    const shown = visibleLabels([marker('a', 0, 0), marker('b', 0.1, 0.3)], 500, null);
    expect(shown.has('a')).toBe(true);
    const crowded = visibleLabels([marker('a', 0, 0), marker('b', 0.06, 0, true)], 500, null);
    expect(crowded.has('a')).toBe(false);
  });
});
