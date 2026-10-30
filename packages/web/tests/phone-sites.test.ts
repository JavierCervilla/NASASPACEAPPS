import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rowDetail, shortName, siteLabels, splitName, toPhoneSite, type PhoneSite } from '../src/phone/phone-site';
import { unlistedSite } from '../src/phone/unlisted-site';
import { filterSites, foldText, matchesQuery, REGIONS, regionName } from '../src/phone/site-search';

const CURATED = JSON.parse(
  readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8'),
) as PhoneSite[];
const SITES = CURATED.map(toPhoneSite);
const byId = (id: string): PhoneSite => {
  const site = SITES.find((s) => s.id === id);
  if (!site) throw new Error(`no site ${id}`);
  return site;
};

describe('splitName', () => {
  it('splits the place from the trailing detail', () => {
    expect(splitName('Mons Mouton (IM-2 Athena)')).toEqual({ title: 'Mons Mouton', detail: 'IM-2 Athena' });
  });

  it('keeps an inner parenthesis in the place', () => {
    expect(splitName('Mare Tranquillitatis (Tranquility Base) (Apollo 11)')).toEqual({
      title: 'Mare Tranquillitatis (Tranquility Base)',
      detail: 'Apollo 11',
    });
  });

  it('leaves a name without a trailing part whole', () => {
    expect(splitName('Haworth')).toEqual({ title: 'Haworth', detail: '' });
  });
});

describe('shortName', () => {
  it('is the mission when it is short, as on the canvas pill', () => {
    expect(shortName(byId('im2-athena'))).toBe('IM-2');
  });

  it('falls back to the place for a long mission name', () => {
    expect(shortName(byId('artemis-haworth'))).toBe('Haworth');
  });
});

describe('siteLabels', () => {
  it('tells IM-2 and the Mons Mouton zone apart in the pill and the title', () => {
    const im2 = siteLabels(byId('im2-athena'));
    const zone = siteLabels(byId('artemis-mons-mouton'));
    expect(im2).toEqual({ title: 'Mons Mouton', subtitle: 'IM-2 Athena', pill: 'IM-2', pillDetail: 'Mons Mouton' });
    expect(zone).toEqual({
      title: 'Mons Mouton',
      subtitle: 'Artemis candidate region',
      pill: 'Mons Mouton',
      pillDetail: 'Artemis candidate region',
    });
    expect(`${im2.pill} ${im2.pillDetail}`).not.toBe(`${zone.pill} ${zone.pillDetail}`);
    expect(`${im2.title} ${im2.subtitle}`).not.toBe(`${zone.title} ${zone.subtitle}`);
  });

  it('falls back to the mission when the name has no trailing detail', () => {
    expect(siteLabels({ name: 'Haworth', mission: 'A long mission name here' }).subtitle).toBe('A long mission name here');
  });

  it('gives every curated site a distinct pill and a distinct title', () => {
    const pills = SITES.map((site) => { const l = siteLabels(site); return `${l.pill}|${l.pillDetail}`; });
    const titles = SITES.map((site) => { const l = siteLabels(site); return `${l.title}|${l.subtitle}`; });
    expect(new Set(pills).size).toBe(SITES.length);
    expect(new Set(titles).size).toBe(SITES.length);
  });
});

describe('unlistedSite', () => {
  it('names a site the build does not know by its id, with no made-up place', () => {
    const site = unlistedSite('new-site-2027');
    expect(siteLabels(site)).toMatchObject({ pill: 'new-site-2027', title: 'new-site-2027' });
    expect(Number.isFinite(site.lat)).toBe(false);
  });
});

describe('rowDetail', () => {
  it('starts with the region while a search spans every region', () => {
    expect(rowDetail(byId('apollo11'), null, 'Apollo')).toBe('Apollo · Apollo 11');
  });

  it('names the mission and the state right now of the selected site', () => {
    expect(rowDetail(byId('im2-athena'), 'window')).toBe('IM-2 Athena · window now');
  });

  it('marks approximate zones', () => {
    expect(rowDetail(byId('change7-target'), null)).toBe("Chang'e-7 target · approximate");
  });
});

describe('site search', () => {
  it('folds case and accents', () => {
    expect(foldText('  Von KÁRMÁN ')).toBe('von karman');
  });

  it('matches the name or the mission', () => {
    expect(matchesQuery(byId('change4'), 'karman')).toBe(true);
    expect(matchesQuery(byId('im2-athena'), 'im-2')).toBe(true);
    expect(matchesQuery(byId('artemis-haworth'), 'crewed')).toBe(true);
    expect(matchesQuery(byId('apollo11'), 'shackleton')).toBe(false);
  });

  it('searches every region while there is a query, in list order', () => {
    const found = filterSites(SITES, { query: 'mouton', group: 'apollo' });
    expect(found.map((s) => s.id)).toEqual([
      'im2-athena',
      'griffin1-nobile',
      'artemis-mons-mouton-plateau',
      'artemis-mons-mouton',
    ]);
  });

  it('shows the whole region for an empty query', () => {
    expect(filterSites(SITES, { query: '', group: 'apollo' })).toHaveLength(6);
  });

  it('lists co-located sites separately, so the hidden Mons Mouton zone is reachable', () => {
    const zones = filterSites(SITES, { query: 'Mons Mouton', group: 'south_pole' }).map((s) => s.id);
    expect(zones).toContain('artemis-mons-mouton');
    expect(zones).toContain('artemis-mons-mouton-plateau');
  });

  it('finds a site of another region than the one picked', () => {
    expect(filterSites(SITES, { query: 'apollo 11', group: 'south_pole' }).map((s) => s.id)).toEqual(['apollo11']);
  });

  it('goes back to the region filter once the query is cleared', () => {
    expect(filterSites(SITES, { query: '  ', group: 'other' }).every((s) => s.group === 'other')).toBe(true);
  });

  it('names the regions as the picker control does', () => {
    expect(REGIONS.map(([group]) => regionName(group))).toEqual(['South pole', 'Apollo', 'Other']);
  });
});

describe('toPhoneSite', () => {
  it('keeps only what the sheet shows', () => {
    expect(Object.keys(byId('im2-athena')).sort()).toEqual(
      ['approximate', 'group', 'id', 'lat', 'lonEast', 'mission', 'name'],
    );
  });
});
