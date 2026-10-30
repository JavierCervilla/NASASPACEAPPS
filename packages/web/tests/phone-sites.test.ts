import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rowDetail, shortName, splitName, toPhoneSite, type PhoneSite } from '../src/phone/phone-site';
import { filterSites, foldText, matchesQuery } from '../src/phone/site-search';

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

describe('rowDetail', () => {
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

  it('keeps the region and the query together, in list order', () => {
    const found = filterSites(SITES, { query: 'mouton', group: 'south_pole' });
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

  it('finds nothing in another region', () => {
    expect(filterSites(SITES, { query: 'apollo 11', group: 'south_pole' })).toEqual([]);
  });
});

describe('toPhoneSite', () => {
  it('keeps only what the sheet shows', () => {
    expect(Object.keys(byId('im2-athena')).sort()).toEqual(
      ['approximate', 'group', 'id', 'lat', 'lonEast', 'mission', 'name'],
    );
  });
});
