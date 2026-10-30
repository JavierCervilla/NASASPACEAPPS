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

import { mkdir, mkdtemp, readdir, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  HORIZONS_RETRY_DELAYS_MS,
  HorizonsError,
  cacheKey,
  createHorizonsClient,
  horizonsResultText,
} from '../src/horizons/client.ts';
import { BODY, toHorizonsParams, type HorizonsQuery } from '../src/horizons/query.ts';
import { fixedFetch, fixtureFetch } from './fake-horizons.ts';

const SUN_NOVEMBER: HorizonsQuery = {
  target: BODY.sun,
  centerBody: BODY.moon,
  point: { lat: -89.5, lonEast: 0, altKm: 0 },
  start: '2026-11-01 00:00',
  stop: '2026-11-30 23:00',
};

const EARTH_NOVEMBER: HorizonsQuery = { ...SUN_NOVEMBER, target: BODY.earth };
const SUN_DECEMBER: HorizonsQuery = { ...SUN_NOVEMBER, start: '2026-12-01 00:00', stop: '2026-12-31 23:00' };

const noSleep = async (): Promise<void> => undefined;

const fileOf = (query: HorizonsQuery): string => `${cacheKey(toHorizonsParams(query))}.json`;

/** A fetch that holds every request until `release()`, then serves the fixtures. */
function gatedFetch() {
  const served = fixtureFetch();
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const fake = async (url: string) => {
    calls.push(url);
    await gate;
    return served(url);
  };
  const calls: string[] = [];
  return Object.assign(fake, { calls, release: () => open() });
}

async function fixtureBody(query: HorizonsQuery): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'horizons-body-'));
  return createHorizonsClient({ fetch: fixtureFetch(), cacheDir: dir }).raw(query);
}

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
    expect(await readdir(join(cacheDir, 'points'))).toEqual([fileOf(SUN_NOVEMBER)]);
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
    await expect(createHorizonsClient({ fetch, cacheDir, sleep: noSleep }).rows(SUN_NOVEMBER)).rejects.toMatchObject({
      kind: 'http',
      message: expect.stringMatching(/ENOTFOUND/),
    });
  });

  it('retries a busy Horizons (503) with growing waits, then succeeds', async () => {
    // Seen in production: four requests at once made Horizons answer 503 to some of them.
    const good = fixtureFetch();
    let busy = 2;
    const calls: string[] = [];
    const fetch = async (url: string) => {
      calls.push(url);
      if (busy-- > 0) return { ok: false, status: 503, text: async () => '<html>Service Unavailable</html>' };
      return good(url);
    };
    const waits: number[] = [];
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    const rows = await createHorizonsClient({ fetch, cacheDir, sleep }).rows(SUN_NOVEMBER);
    expect(rows).toHaveLength(720);
    expect(calls).toHaveLength(3);
    expect(waits).toEqual(HORIZONS_RETRY_DELAYS_MS.slice(0, 2));
  });

  it('waits as long as a rate-limited Horizons (429) asks, up to the longest delay', async () => {
    const good = fixtureFetch();
    const retryAfter = ['2', '120', null];
    const fetch = async (url: string) => {
      if (retryAfter.length === 0) return good(url);
      const value = retryAfter.shift() ?? null;
      const headers = { get: (name: string) => (name.toLowerCase() === 'retry-after' ? value : null) };
      return { ok: false, status: 429, headers, text: async () => 'Too Many Requests' };
    };
    const waits: number[] = [];
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    expect(await createHorizonsClient({ fetch, cacheDir, sleep }).rows(SUN_NOVEMBER)).toHaveLength(720);
    // Two seconds as asked, 120 s capped at the longest delay, and the fixed delay without the header.
    expect(waits).toEqual([2000, Math.max(...HORIZONS_RETRY_DELAYS_MS), HORIZONS_RETRY_DELAYS_MS[2]]);
  });

  it('never waits less than the fixed delay when a 429 asks for 0 or 1 s', async () => {
    const good = fixtureFetch();
    const retryAfter = ['0', '1'];
    const fetch = async (url: string) => {
      if (retryAfter.length === 0) return good(url);
      const value = retryAfter.shift() ?? null;
      const headers = { get: (name: string) => (name.toLowerCase() === 'retry-after' ? value : null) };
      return { ok: false, status: 429, headers, text: async () => 'Too Many Requests' };
    };
    const waits: number[] = [];
    await createHorizonsClient({ fetch, cacheDir, sleep: async (ms) => void waits.push(ms) }).rows(SUN_NOVEMBER);
    expect(waits).toEqual(HORIZONS_RETRY_DELAYS_MS.slice(0, 2));
  });

  it('keeps the fixed delays when a 503 carries Retry-After', async () => {
    const good = fixtureFetch();
    let busy = 1;
    const fetch = async (url: string) => {
      if (busy-- <= 0) return good(url);
      const headers = { get: () => '5' };
      return { ok: false, status: 503, headers, text: async () => 'Service Unavailable' };
    };
    const waits: number[] = [];
    await createHorizonsClient({ fetch, cacheDir, sleep: async (ms) => void waits.push(ms) }).rows(SUN_NOVEMBER);
    expect(waits).toEqual([HORIZONS_RETRY_DELAYS_MS[0]]);
  });

  it('gives up after the last retry and reports the last error', async () => {
    const fetch = fixedFetch(503, '<html>Service Unavailable</html>');
    const client = createHorizonsClient({ fetch, cacheDir, sleep: noSleep });
    await expect(client.rows(SUN_NOVEMBER)).rejects.toThrow(/HTTP 503/);
    expect(fetch.calls).toHaveLength(HORIZONS_RETRY_DELAYS_MS.length + 1);
  });

  it('does not retry a request Horizons rejects (400)', async () => {
    const fetch = fixedFetch(400, JSON.stringify({ error: 'Cannot interpret date.' }));
    await createHorizonsClient({ fetch, cacheDir, sleep: noSleep }).rows(SUN_NOVEMBER).catch(() => undefined);
    expect(fetch.calls).toHaveLength(1);
  });

  it('returns the raw body as Horizons sent it', async () => {
    const raw = await createHorizonsClient({ fetch: fixtureFetch(), cacheDir }).raw(SUN_NOVEMBER);
    const file = join(cacheDir, 'points', fileOf(SUN_NOVEMBER));
    expect(await readFile(file, 'utf8')).toBe(raw);
  });
});

describe('cache layout', () => {
  it('writes a pinned table to pinned/ and any other to points/, never to the legacy root', async () => {
    const client = createHorizonsClient({ fetch: fixtureFetch(), cacheDir });
    await client.raw(SUN_NOVEMBER, { pinned: true });
    await client.raw(EARTH_NOVEMBER);
    expect(await readdir(join(cacheDir, 'pinned'))).toEqual([fileOf(SUN_NOVEMBER)]);
    expect(await readdir(join(cacheDir, 'points'))).toEqual([fileOf(EARTH_NOVEMBER)]);
    expect((await readdir(cacheDir)).sort()).toEqual(['pinned', 'points']);
  });

  it('still reads a table from the legacy root, without calling Horizons or copying it', async () => {
    const body = await fixtureBody(SUN_NOVEMBER);
    await writeFile(join(cacheDir, fileOf(SUN_NOVEMBER)), body, 'utf8');
    const fetch = fixtureFetch();
    expect(await createHorizonsClient({ fetch, cacheDir }).raw(SUN_NOVEMBER, { pinned: true })).toBe(body);
    expect(fetch.calls).toHaveLength(0);
    expect(await readdir(cacheDir)).toEqual([fileOf(SUN_NOVEMBER)]);
  });

  it('reads pinned/ first, then points/, then the legacy root', async () => {
    const body = await fixtureBody(SUN_NOVEMBER);
    await mkdir(join(cacheDir, 'pinned'), { recursive: true });
    await mkdir(join(cacheDir, 'points'), { recursive: true });
    await writeFile(join(cacheDir, 'pinned', fileOf(SUN_NOVEMBER)), body, 'utf8');
    await writeFile(join(cacheDir, 'points', fileOf(SUN_NOVEMBER)), 'points', 'utf8');
    await writeFile(join(cacheDir, fileOf(SUN_NOVEMBER)), 'legacy', 'utf8');
    await writeFile(join(cacheDir, 'points', fileOf(EARTH_NOVEMBER)), 'points', 'utf8');
    await writeFile(join(cacheDir, fileOf(EARTH_NOVEMBER)), 'legacy', 'utf8');
    const client = createHorizonsClient({ fetch: fixtureFetch(), cacheDir });
    expect(await client.raw(SUN_NOVEMBER)).toBe(body);
    expect(await client.raw(EARTH_NOVEMBER)).toBe('points');
  });

  it('evicts the least recently used points/ tables once the byte cap is passed, and never a pinned one', async () => {
    const sun = await fixtureBody(SUN_NOVEMBER);
    const size = Buffer.byteLength(sun);
    const points = join(cacheDir, 'points');
    await mkdir(points, { recursive: true });
    await mkdir(join(cacheDir, 'pinned'), { recursive: true });
    const old = join(points, `${'0'.repeat(64)}.json`);
    await writeFile(old, 'x'.repeat(size), 'utf8');
    await writeFile(join(points, fileOf(SUN_NOVEMBER)), sun, 'utf8');
    await writeFile(join(cacheDir, 'pinned', `${'1'.repeat(64)}.json`), 'x'.repeat(size * 10), 'utf8');
    const now = Date.now() / 1000;
    await utimes(old, now - 300, now - 300);
    await utimes(join(points, fileOf(SUN_NOVEMBER)), now - 600, now - 600);

    const fetch = fixtureFetch();
    // Room for two tables of this size: the third one written evicts the oldest.
    const client = createHorizonsClient({ fetch, cacheDir, maxPointsBytes: size * 2 + 1000 });
    // A hit refreshes the mtime, so the Sun table, written first, is now the most recently used.
    await client.raw(SUN_NOVEMBER);
    expect((await stat(join(points, fileOf(SUN_NOVEMBER)))).mtimeMs).toBeGreaterThan((now - 60) * 1000);
    await client.raw(EARTH_NOVEMBER);
    expect((await readdir(points)).sort()).toEqual([fileOf(EARTH_NOVEMBER), fileOf(SUN_NOVEMBER)].sort());
    expect(await readdir(join(cacheDir, 'pinned'))).toHaveLength(1);
    expect(fetch.calls).toHaveLength(1);
  });
});

describe('stale temporary files', () => {
  it('sweeps the ones left by a crash on the first scan of points/, and does not count them', async () => {
    const sun = await fixtureBody(SUN_NOVEMBER);
    const points = join(cacheDir, 'points');
    await mkdir(points, { recursive: true });
    const stale = join(points, `${'2'.repeat(64)}.json.1.tmp`);
    const fresh = join(points, `${'3'.repeat(64)}.json.1.tmp`);
    // Far bigger than the cap: counted, it would make the next write evict.
    await writeFile(stale, 'x'.repeat(Buffer.byteLength(sun) * 10), 'utf8');
    await writeFile(fresh, 'x', 'utf8');
    const old = Date.now() / 1000 - 3600;
    await utimes(stale, old, old);
    const neighbour = join(points, fileOf(EARTH_NOVEMBER));
    await writeFile(neighbour, 'earth', 'utf8');
    await utimes(neighbour, old, old);

    const client = createHorizonsClient({ fetch: fixtureFetch(), cacheDir, maxPointsBytes: Buffer.byteLength(sun) * 2 });
    await client.raw(SUN_NOVEMBER);
    expect((await readdir(points)).sort()).toEqual(
      [fileOf(EARTH_NOVEMBER), fileOf(SUN_NOVEMBER), `${'3'.repeat(64)}.json.1.tmp`].sort(),
    );
  });
});

describe('download limit', () => {
  it('refuses a cache miss at once with kind busy when the waiting queue is full', async () => {
    const fetch = gatedFetch();
    const client = createHorizonsClient({ fetch, cacheDir, maxConcurrentDownloads: 1, maxQueuedDownloads: 1 });
    // onMiss runs right before the download is queued, so awaiting it orders the three calls.
    const queued = (): [Promise<void>, () => void] => {
      let signal: () => void = () => undefined;
      return [new Promise<void>((resolve) => (signal = resolve)), () => signal()];
    };
    const [firstQueued, onFirst] = queued();
    const first = client.raw(SUN_NOVEMBER, { onMiss: onFirst });
    await firstQueued;
    const [secondQueued, onSecond] = queued();
    const second = client.raw(EARTH_NOVEMBER, { onMiss: onSecond });
    await secondQueued;
    let thirdMissed = false;
    const third = await client.raw(SUN_DECEMBER, { onMiss: () => void (thirdMissed = true) }).catch((e: unknown) => e);
    expect(third).toBeInstanceOf(HorizonsError);
    expect((third as HorizonsError).kind).toBe('busy');
    // A miss refused as busy is not counted against the caller.
    expect(thirdMissed).toBe(false);
    fetch.release();
    await Promise.all([first, second]);
    expect(fetch.calls).toHaveLength(2);
  });

  it('keeps at most maxConcurrentDownloads in flight, shared by every caller', async () => {
    const served = fixtureFetch();
    let inFlight = 0;
    let peak = 0;
    const fetch = async (url: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return served(url);
    };
    const client = createHorizonsClient({ fetch, cacheDir });
    await Promise.all([SUN_NOVEMBER, EARTH_NOVEMBER, SUN_DECEMBER].map((q) => client.raw(q)));
    expect(peak).toBe(2);
  });

  it('never makes a cache hit or an in-flight duplicate wait in the queue', async () => {
    const fetch = gatedFetch();
    await mkdir(join(cacheDir, 'pinned'), { recursive: true });
    await writeFile(join(cacheDir, 'pinned', fileOf(EARTH_NOVEMBER)), await fixtureBody(EARTH_NOVEMBER), 'utf8');
    const client = createHorizonsClient({ fetch, cacheDir, maxConcurrentDownloads: 1, maxQueuedDownloads: 0 });
    let missed: () => void = () => undefined;
    const queued = new Promise<void>((resolve) => (missed = resolve));
    const first = client.raw(SUN_NOVEMBER, { onMiss: () => missed() });
    await queued;
    const duplicate = client.raw(SUN_NOVEMBER);
    expect(await client.raw(EARTH_NOVEMBER)).toMatch(/\$\$SOE/);
    fetch.release();
    expect(await duplicate).toBe(await first);
    expect(fetch.calls).toHaveLength(1);
  });
});

describe('onMiss', () => {
  it('is called once per download, before it, and not for a hit or an in-flight duplicate', async () => {
    const fetch = fixtureFetch();
    const client = createHorizonsClient({ fetch, cacheDir });
    let misses = 0;
    const onMiss = () => {
      expect(fetch.calls).toHaveLength(0);
      misses += 1;
    };
    await Promise.all([client.raw(SUN_NOVEMBER, { onMiss }), client.raw(SUN_NOVEMBER, { onMiss })]);
    await client.raw(SUN_NOVEMBER, { onMiss });
    expect(misses).toBe(1);
  });

  it('refuses the download when it throws', async () => {
    const fetch = fixtureFetch();
    const refuse = () => {
      throw new Error('over the limit');
    };
    await expect(createHorizonsClient({ fetch, cacheDir }).rows(SUN_NOVEMBER, { onMiss: refuse })).rejects.toThrow(
      'over the limit',
    );
    expect(fetch.calls).toHaveLength(0);
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
