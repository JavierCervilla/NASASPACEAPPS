import { describe, expect, it } from 'vitest';
import { DEFAULT_SITES_FILE, loadSites, parseSites } from '../src/sites.ts';

const SITE = {
  id: 'a-site',
  name: 'A',
  mission: 'M',
  agency: 'X',
  status: 'planned',
  lat: -85,
  lonEast: 30,
  coordinateNote: 'n',
  sources: [{ label: 'l', url: 'https://example.org' }],
};

describe('sites file', () => {
  it('holds only the 89.5 S test point for now', async () => {
    const sites = await loadSites(DEFAULT_SITES_FILE);
    expect(sites.map((s) => s.id)).toEqual(['south-pole-89-5']);
    expect(sites[0]).toMatchObject({ lat: -89.5, lonEast: 0 });
  });

  it('accepts a valid entry', () => {
    expect(parseSites([SITE])).toEqual([SITE]);
  });

  it.each([
    [{ ...SITE, id: 'Bad Id' }, /"id"/],
    [{ ...SITE, lat: -91 }, /"lat"/],
    [{ ...SITE, lonEast: '30' }, /"lonEast"/],
    [{ ...SITE, name: '' }, /"name"/],
    [{ ...SITE, sources: [{ label: 'l' }] }, /"sources"/],
  ])('rejects an invalid entry %#', (entry, message) => {
    expect(() => parseSites([entry])).toThrow(message);
  });

  it('rejects duplicate ids and a non-array file', () => {
    expect(() => parseSites([SITE, SITE])).toThrow(/unique/);
    expect(() => parseSites({ sites: [] })).toThrow(/array/);
  });
});
