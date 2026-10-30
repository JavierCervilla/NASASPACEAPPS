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
import { DEFAULT_SITES_FILE, loadSites, parseSites } from '../src/sites.ts';

const SITE = {
  id: 'a-site',
  group: 'south_pole',
  name: 'A',
  mission: 'M',
  agency: 'X',
  status: 'planned',
  statusDate: '2027',
  lat: -85,
  lonEast: 30,
  approximate: false,
  coordinateNote: 'n',
  sources: [{ label: 'l', url: 'https://example.org', note: 'n' }],
};

// The curated sites for which the research found no citable coordinate (VENT-3 sites proposal): the nine Artemis
// candidate regions and three missions that only name a target feature. Their point is a stand-in.
const NO_CITABLE_COORDINATE = [
  'change7-target',
  'bluemoon-mk1-pathfinder',
  'griffin1-nobile',
  'artemis-peak-near-cabeus-b',
  'artemis-haworth',
  'artemis-malapert-massif',
  'artemis-mons-mouton-plateau',
  'artemis-mons-mouton',
  'artemis-nobile-rim-1',
  'artemis-nobile-rim-2',
  'artemis-de-gerlache-rim-2',
  'artemis-slater-plain',
];
const GROUP_SIZES = { south_pole: 16, apollo: 6, other: 7 };

const sites = await loadSites(DEFAULT_SITES_FILE);

describe('curated sites file', () => {
  it('holds the 29 approved sites in three groups', () => {
    expect(sites).toHaveLength(29);
    for (const [group, size] of Object.entries(GROUP_SIZES)) {
      expect(sites.filter((s) => s.group === group)).toHaveLength(size);
    }
  });

  it.each(sites.map((s) => [s.id, s] as const))('%s has its coordinates in range and an https source', (_, site) => {
    expect(site.lat).toBeGreaterThanOrEqual(-90);
    expect(site.lat).toBeLessThanOrEqual(90);
    expect(site.lonEast).toBeGreaterThanOrEqual(-180);
    expect(site.lonEast).toBeLessThanOrEqual(180);
    expect(site.sources.some((source) => new URL(source.url).protocol === 'https:')).toBe(true);
  });

  it('flags as approximate exactly the sites without a citable coordinate, and says it is not a landing point', () => {
    expect(sites.filter((s) => s.approximate).map((s) => s.id).sort()).toEqual([...NO_CITABLE_COORDINATE].sort());
    for (const site of sites.filter((s) => s.approximate)) {
      expect(site.coordinateNote).toMatch(/^Approximate, not a landing point/);
    }
    for (const site of sites.filter((s) => !s.approximate)) expect(site.coordinateNote).not.toMatch(/approximate/i);
  });
});

describe('parseSites', () => {

  it('accepts a valid entry', () => {
    expect(parseSites([SITE])).toEqual([SITE]);
  });

  it.each([
    [{ ...SITE, id: 'Bad Id' }, /"id"/],
    [{ ...SITE, lat: -91 }, /"lat"/],
    [{ ...SITE, lonEast: '30' }, /"lonEast"/],
    [{ ...SITE, name: '' }, /"name"/],
    [{ ...SITE, sources: [{ label: 'l' }] }, /"sources"/],
    [{ ...SITE, group: 'north_pole' }, /"group"/],
    [{ ...SITE, approximate: 'yes' }, /"approximate"/],
    [{ ...SITE, statusDate: undefined }, /"statusDate"/],
  ])('rejects an invalid entry %#', (entry, message) => {
    expect(() => parseSites([entry])).toThrow(message);
  });

  it('rejects duplicate ids and a non-array file', () => {
    expect(() => parseSites([SITE, SITE])).toThrow(/unique/);
    expect(() => parseSites({ sites: [] })).toThrow(/array/);
  });
});
