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

import { readFile } from 'node:fs/promises';
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

// NASA's illumination maps read at every curated site south of 80 deg S (VENT-39), with their provenance.
const PSR_FLAGS = new URL('../../sim/data/psr-flags.json', import.meta.url);
interface PsrFlag {
  readonly id: string;
  readonly lat: number;
  readonly lon: number;
  readonly avgSun: number;
  readonly psrShare: number;
  readonly onPsrFloor: boolean;
}
const flags = (JSON.parse(await readFile(PSR_FLAGS, 'utf8')) as { sites: PsrFlag[] }).sites;

describe('shadow of the curated sites (VENT-39)', () => {
  it('lists every curated site south of 80 deg S at its own point', () => {
    const south = sites.filter((s) => s.lat < -80);
    expect(flags.map((f) => f.id).sort()).toEqual(south.map((s) => s.id).sort());
    for (const flag of flags) {
      const site = south.find((s) => s.id === flag.id);
      expect([flag.lat, flag.lon]).toEqual([site?.lat, site?.lonEast]);
    }
  });

  it('marks in permanent shadow exactly the sites on a PSR floor, with no Sun on average', () => {
    const psr = sites.filter((s) => s.shadow?.kind === 'psr').map((s) => s.id).sort();
    expect(psr).toEqual(flags.filter((f) => f.onPsrFloor).map((f) => f.id).sort());
    expect(psr).toEqual(['artemis-de-gerlache-rim-2', 'artemis-haworth', 'artemis-slater-plain', 'change7-target']);
    for (const flag of flags.filter((f) => f.onPsrFloor)) expect(flag.avgSun).toBe(0);
  });

  it('marks only the Cabeus B point as a dim floor, with the share the map gives', () => {
    const dim = sites.filter((s) => s.shadow?.kind === 'dimFloor');
    expect(dim.map((s) => s.id)).toEqual(['artemis-peak-near-cabeus-b']);
    const flag = flags.find((f) => f.id === 'artemis-peak-near-cabeus-b');
    expect(dim[0]?.shadow?.avgSun).toBe(flag?.avgSun);
  });

  it('marks only approximate sites, and cites the NASA product', () => {
    for (const site of sites.filter((s) => s.shadow)) {
      expect(site.approximate).toBe(true);
      expect(site.shadow?.source.url).toBe('https://pgda.gsfc.nasa.gov/products/69');
    }
  });
});

describe('parseSites', () => {

  it('accepts a valid entry', () => {
    expect(parseSites([SITE])).toEqual([SITE]);
  });

  it('accepts a shadow of a known kind', () => {
    const shadow = { kind: 'psr', avgSun: 0, source: SITE.sources[0] };
    expect(parseSites([{ ...SITE, shadow }])).toEqual([{ ...SITE, shadow }]);
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
    [{ ...SITE, shadow: { kind: 'dark', avgSun: 0, source: SITE.sources[0] } }, /"shadow"/],
    [{ ...SITE, shadow: { kind: 'psr', avgSun: 1.5, source: SITE.sources[0] } }, /"shadow"/],
    [{ ...SITE, shadow: { kind: 'psr', avgSun: 0 } }, /"shadow"/],
  ])('rejects an invalid entry %#', (entry, message) => {
    expect(() => parseSites([entry])).toThrow(message);
  });

  it('rejects duplicate ids and a non-array file', () => {
    expect(() => parseSites([SITE, SITE])).toThrow(/unique/);
    expect(() => parseSites({ sites: [] })).toThrow(/array/);
  });
});
