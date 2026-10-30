import { describe, expect, it, vi } from 'vitest';
import { loadSites, parseSiteList } from '../src/globe/sites-client';

const IM2 = { id: 'im2-athena', name: 'Mons Mouton (IM-2 Athena)', lat: -84.7906, lonEast: 29.1957, approximate: false };
const URL_ = '/api/v1/sites';

function respond(status: number, body: unknown): typeof fetch {
  return vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
}

describe('parseSiteList', () => {
  it('keeps only what the globe draws', () => {
    expect(parseSiteList({ sites: [{ ...IM2, group: 'south_pole', sources: [] }] })).toEqual([IM2]);
  });

  it('keeps at most 500 sites and cuts each name to 120 characters', () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ ...IM2, id: `s${i}`, name: 'n'.repeat(121) }));
    const sites = parseSiteList({ sites: many });
    expect(sites).toHaveLength(500);
    expect(sites?.[0]?.name).toBe('n'.repeat(120));
    expect(sites?.at(-1)?.id).toBe('s499');
  });

  it('rejects a body that is not a site list', () => {
    expect(parseSiteList({ sites: [{ ...IM2, lat: 'south' }] })).toBeNull();
    expect(parseSiteList([IM2])).toBeNull();
    expect(parseSiteList(null)).toBeNull();
  });
});

describe('loadSites', () => {
  it('says the body was not the expected shape when a 200 is malformed', async () => {
    const warn = vi.fn();
    expect(await loadSites({ fetch: respond(200, { items: [] }), url: URL_, warn })).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('not the expected { sites: [...] } shape');
    expect(warn.mock.calls[0]?.[0]).not.toContain('HTTP 200');
  });

  it('names the HTTP status of a failed response', async () => {
    const warn = vi.fn();
    await loadSites({ fetch: respond(503, 'busy'), url: URL_, warn });
    expect(warn.mock.calls[0]?.[0]).toContain('HTTP 503');
  });

  it('returns the API sites', async () => {
    const warn = vi.fn();
    expect(await loadSites({ fetch: respond(200, { sites: [IM2] }), url: URL_, warn })).toEqual([IM2]);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['a 404 from a static preview', respond(404, '<!doctype html>')],
    ['an HTML page served with 200', respond(200, '<!doctype html>')],
    ['a network failure', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')))],
  ])('shows no markers after %s, with exactly one warning', async (_, fetchFn) => {
    const warn = vi.fn();
    expect(await loadSites({ fetch: fetchFn as typeof fetch, url: URL_, warn })).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
