import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { HorizonsError, cacheKey, createHorizonsClient, horizonsResultText } from '../src/horizons/client.ts';
import { BODY, toHorizonsParams, type HorizonsQuery } from '../src/horizons/query.ts';
import { fixedFetch, fixtureFetch } from './fake-horizons.ts';

const SUN_NOVEMBER: HorizonsQuery = {
  target: BODY.sun,
  centerBody: BODY.moon,
  point: { lat: -89.5, lonEast: 0, altKm: 0 },
  start: '2026-11-01 00:00',
  stop: '2026-11-30 23:00',
};

let cacheDir: string;
beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'horizons-test-'));
});

describe('createHorizonsClient', () => {
  it('sends the request to the Horizons API and parses the rows', async () => {
    const fetch = fixtureFetch();
    const rows = await createHorizonsClient({ fetch, cacheDir }).rows(SUN_NOVEMBER);
    expect(rows).toHaveLength(720);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0]).toMatch(/^https:\/\/ssd\.jpl\.nasa\.gov\/api\/horizons\.api\?format=json&COMMAND=%2710%27/);
  });

  it('never sends the same request twice: the body is cached on disk under the hash of the parameters', async () => {
    const fetch = fixtureFetch();
    await createHorizonsClient({ fetch, cacheDir }).rows(SUN_NOVEMBER);
    // A new client (as after a restart) reads the same cache directory.
    const again = await createHorizonsClient({ fetch, cacheDir }).rows(SUN_NOVEMBER);
    expect(again).toHaveLength(720);
    expect(fetch.calls).toHaveLength(1);
    expect(await readdir(cacheDir)).toEqual([`${cacheKey(toHorizonsParams(SUN_NOVEMBER))}.json`]);
  });

  it('shares one call between concurrent identical requests', async () => {
    const fetch = fixtureFetch();
    const client = createHorizonsClient({ fetch, cacheDir });
    await Promise.all([client.rows(SUN_NOVEMBER), client.rows(SUN_NOVEMBER)]);
    expect(fetch.calls).toHaveLength(1);
  });

  it('reports an HTTP error with the Horizons explanation, and caches nothing', async () => {
    const fetch = fixedFetch(400, JSON.stringify({ error: 'Cannot interpret date. Type "?!" for formats.' }));
    const client = createHorizonsClient({ fetch, cacheDir });
    await expect(client.rows(SUN_NOVEMBER)).rejects.toThrow(/HTTP 400: Horizons error: Cannot interpret date/);
    expect(await readdir(cacheDir)).toEqual([]);
  });

  it('reports a Horizons error written in the result text, and caches nothing', async () => {
    const fetch = fixedFetch(200, JSON.stringify({ result: 'No site matches. Use "*@body" to list' }));
    const client = createHorizonsClient({ fetch, cacheDir });
    const error = await client.rows(SUN_NOVEMBER).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HorizonsError);
    expect((error as HorizonsError).kind).toBe('api');
    expect((error as HorizonsError).message).toMatch(/No site matches/);
    await client.rows(SUN_NOVEMBER).catch(() => undefined);
    expect(fetch.calls).toHaveLength(2);
  });

  it('reports a failed connection as an HTTP error', async () => {
    const fetch = async (): Promise<never> => {
      throw new Error('getaddrinfo ENOTFOUND');
    };
    await expect(createHorizonsClient({ fetch, cacheDir }).rows(SUN_NOVEMBER)).rejects.toMatchObject({
      kind: 'http',
      message: expect.stringMatching(/ENOTFOUND/),
    });
  });

  it('returns the raw body as Horizons sent it', async () => {
    const raw = await createHorizonsClient({ fetch: fixtureFetch(), cacheDir }).raw(SUN_NOVEMBER);
    const file = join(cacheDir, `${cacheKey(toHorizonsParams(SUN_NOVEMBER))}.json`);
    expect(await readFile(file, 'utf8')).toBe(raw);
  });
});

describe('horizonsResultText', () => {
  it('rejects a body that is not JSON or has no result', () => {
    expect(() => horizonsResultText('<html>')).toThrow(/not JSON/);
    expect(() => horizonsResultText('null')).toThrow(/not an object/);
    expect(() => horizonsResultText('{}')).toThrow(/no "result"/);
  });
});

describe('cacheKey', () => {
  it('does not depend on the order of the parameters', () => {
    expect(cacheKey({ a: '1', b: '2' })).toBe(cacheKey({ b: '2', a: '1' }));
    expect(cacheKey({ a: '1', b: '2' })).not.toBe(cacheKey({ a: '1', b: '3' }));
  });
});
