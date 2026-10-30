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
import { readFileSync } from 'node:fs';
import { markerKind, markerLabel, mergeColocated, type GlobeSite } from '../src/globe/markers';

// The curated list the API serves.
const CURATED = JSON.parse(readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8')) as GlobeSite[];

const site = (approximate: boolean) => ({ id: 'x', name: 'Mons Mouton (IM-2 Athena)', lat: -84.79, lonEast: 29.2, approximate });

describe('markerKind', () => {
  it('draws a published point as an exact touchdown', () => {
    expect(markerKind(site(false))).toBe('exact');
  });

  it('draws a stand-in coordinate as an approximate zone', () => {
    expect(markerKind(site(true))).toBe('zone');
  });
});

describe('markerLabel', () => {
  it('names the site and says whether its point is exact', () => {
    expect(markerLabel(site(false))).toBe('Mons Mouton (IM-2 Athena), landing site');
    expect(markerLabel(site(true))).toBe('Mons Mouton (IM-2 Athena), approximate zone');
  });
});

describe('mergeColocated', () => {
  const at = (id: string, lat: number, lonEast: number, approximate: boolean) => ({ id, name: `Site ${id}`, lat, lonEast, approximate });

  it('keeps sites at distinct points apart', () => {
    const sites = [at('a', -84.6, 31, true), at('b', -84.6, 31.0001, true)];
    expect(mergeColocated(sites).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('merges sites with identical coordinates into one marker that names them all', () => {
    const [merged, ...rest] = mergeColocated([at('a', -85.2752, 53.2725, true), at('x', 1, 2, false), at('b', -85.2752, 53.2725, true)]);
    expect(rest.map((m) => m.id)).toEqual(['x']);
    expect(merged).toMatchObject({ id: 'a', lat: -85.2752, lonEast: 53.2725, approximate: true });
    expect(merged?.members.map((m) => m.id)).toEqual(['a', 'b']);
    expect(markerLabel(merged!)).toBe('Site a; Site b, approximate zone');
  });

  it('draws the merged marker as exact when any member is exact', () => {
    const [merged] = mergeColocated([at('zone', 0, 0, true), at('exact', 0, 0, false)]);
    expect(markerKind(merged!)).toBe('exact');
  });

  it('turns the 29 curated sites into 26 markers, 9 of them zones', () => {
    const merged = mergeColocated(CURATED);
    expect(merged).toHaveLength(26);
    expect(merged.filter((m) => m.approximate)).toHaveLength(9);
    const nobile = merged.find((m) => m.members.some((s) => s.id === 'artemis-nobile-rim-2'));
    expect(nobile?.members.map((s) => s.id)).toEqual(['griffin1-nobile', 'artemis-nobile-rim-1', 'artemis-nobile-rim-2']);
  });
});
