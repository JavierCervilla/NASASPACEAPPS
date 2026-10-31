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

/**
 * The service worker (VENT-28): which requests it answers and how, its caches' names (the static one changes with the
 * build), what it caches at install, and where the offline notice reads the date of the data.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { precached, precacheOf, requestPath } from '../scripts/service-worker.mjs';
import { syncDate, syncedAt, syncUrl } from '../src/pwa/offline-status';
import { workerAt } from '../src/pwa/register-sw';
import {
  API_CACHE,
  FETCHED_AT_HEADER,
  routeOf,
  staleCaches,
  staticCacheName,
  STATIC_PREFIX,
} from '../src/pwa/sw-routes';
import { apiFirst, cacheFirst, networkFirst, type SwNet } from '../src/pwa/sw-strategies';

const SCOPE = new URL('https://ventana.test/');
const route = (path: string, navigate = false) => routeOf(new URL(path, SCOPE), SCOPE, navigate);

describe('routeOf', () => {
  it.each([
    ['/', 'html'],
    ['/es/', 'html'],
    ['/de/index.html', 'html'],
    ['/_astro/page.Ab12.js', 'static'],
    ['/textures/moon-lroc-2k.jpg', 'static'],
    ['/es/manifest.webmanifest', 'static'],
    ['/api/v1/sites', 'api'],
    ['/api/v1/sites/im2-athena?from=2026-11-01&to=2026-11-30', 'api'],
    ['/en-xa/', 'bypass'],
    ['/en-xa/index.html', 'bypass'],
    ['/sw.js', 'bypass'],
    ['https://ssd.jpl.nasa.gov/api/horizons.api', 'bypass'],
  ])('%s is %s', (path, expected) => {
    expect(route(path)).toBe(expected);
  });

  it('treats any navigation as a page, `?site=` included', () => {
    expect(route('/es/?site=apollo11', true)).toBe('html');
  });

  it('leaves alone what lies outside a sub-path scope', () => {
    const scope = new URL('https://host.test/ventana/');
    expect(routeOf(new URL('https://host.test/other/'), scope)).toBe('bypass');
    expect(routeOf(new URL('https://host.test/ventana/fr/'), scope)).toBe('html');
    expect(routeOf(new URL('https://host.test/ventana/api/v1/sites'), scope)).toBe('api');
  });
});

describe('cache names', () => {
  it('names the static cache after the build’s digest', () => {
    expect(staticCacheName('ce7241200df2829922ce')).toBe(`${STATIC_PREFIX}ce7241200df2`);
  });

  it('drops only older static caches, never the API’s', () => {
    const current = staticCacheName('bbbbbbbbbbbb');
    const names = [staticCacheName('aaaaaaaaaaaa'), current, API_CACHE, 'someone-else'];
    expect(staleCaches(names, current)).toEqual([staticCacheName('aaaaaaaaaaaa')]);
  });
});

/** A dist folder with `files` (path to content). */
function dist(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-precache-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
}

const BUILD = {
  'index.html': 'en',
  'es/index.html': 'es',
  'es/manifest.webmanifest': '{}',
  'en-xa/index.html': 'pseudo',
  '_astro/app.1.js': 'js',
  'icons/phase/moon-00.webp': 'w',
  'textures/moon-lroc-2k.jpg': '2k',
  'textures/moon-lroc-8k.jpg': '8k',
  'sw.js': 'worker',
};

describe('precache', () => {
  it('caches the locale shells, the build’s files and the start maps, not the pseudo-locale nor the 8K map', () => {
    expect(precacheOf(dist(BUILD)).precache.toSorted()).toEqual([
      '',
      '_astro/app.1.js',
      'es/',
      'es/manifest.webmanifest',
      'icons/phase/moon-00.webp',
      'textures/moon-lroc-2k.jpg',
    ]);
    expect(precached('en-xa/index.html')).toBe(false);
    expect(requestPath('de/index.html')).toBe('de/');
  });

  it('changes the digest, and so the cache name, when any cached file changes', () => {
    const before = precacheOf(dist(BUILD)).digest;
    expect(precacheOf(dist(BUILD)).digest).toBe(before);
    expect(precacheOf(dist({ ...BUILD, '_astro/app.1.js': 'js2' })).digest).not.toBe(before);
    expect(precacheOf(dist({ ...BUILD, 'textures/moon-lroc-8k.jpg': 'other' })).digest).toBe(before);
  });
});

/** An in-memory cache storage and a scripted network. */
function fakeNet(answer: () => Promise<Response>) {
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (req: RequestInfo | URL, ignoreSearch = false) => {
    const url = new URL(typeof req === 'string' || req instanceof URL ? req : req.url);
    if (ignoreSearch) url.search = '';
    return url.href;
  };
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      put: async (req: RequestInfo | URL, res: Response) => void store.set(keyOf(req), res),
      match: async (req: RequestInfo | URL, opts?: { ignoreSearch?: boolean }) =>
        store.get(keyOf(req, opts?.ignoreSearch))?.clone() ??
        [...store.entries()].find(([k]) => opts?.ignoreSearch && keyOf(k, true) === keyOf(req, true))?.[1].clone(),
    };
  };
  const caches = { open } as unknown as CacheStorage;
  const net: SwNet = { caches, fetch: () => answer(), now: () => 1_793_000_000_000 };
  return { net, stores };
}

const ok = (body: string) => () => Promise.resolve(new Response(body));
const down = () => Promise.reject(new TypeError('offline'));

describe('strategies', () => {
  it('network first keeps the answer and serves it offline, ignoring a page’s `?site=`', async () => {
    const online = fakeNet(ok('page'));
    const keep = { cache: 'c', ignoreSearch: true };
    await networkFirst(online.net, new Request('https://ventana.test/es/'), keep);
    const offline = { ...online.net, fetch: down };
    const res = await networkFirst(offline, new Request('https://ventana.test/es/?site=apollo11'), keep);
    expect(await res.text()).toBe('page');
  });

  it('network first fails as the network does when nothing is kept', async () => {
    const { net } = fakeNet(down);
    await expect(networkFirst(net, new Request('https://ventana.test/fr/'), { cache: 'c' })).rejects.toThrow('offline');
  });

  it('cache first answers from the cache without asking the network again', async () => {
    let asked = 0;
    const { net } = fakeNet(() => {
      asked += 1;
      return Promise.resolve(new Response('map'));
    });
    const request = () => new Request('https://ventana.test/textures/moon-lroc-4k.jpg');
    await cacheFirst(net, request(), 'c');
    expect(await (await cacheFirst(net, request(), 'c')).text()).toBe('map');
    expect(asked).toBe(1);
  });

  it('the API’s answers are stamped and the sync entry records when', async () => {
    const online = fakeNet(ok('{"hours":[]}'));
    const keep = { cache: API_CACHE, syncUrl: 'https://ventana.test/__ventana-synced-at' };
    const url = 'https://ventana.test/api/v1/sites/apollo11?from=a&to=b';
    await apiFirst(online.net, new Request(url), keep);
    const kept = await apiFirst({ ...online.net, fetch: down }, new Request(url), keep);
    expect(kept.headers.get(FETCHED_AT_HEADER)).toBe('1793000000000');
    expect(await kept.text()).toBe('{"hours":[]}');
    const sync = await online.stores.get(API_CACHE)?.get(keep.syncUrl)?.text();
    expect(sync).toBe('1793000000000');
  });
});

describe('the page side', () => {
  it('registers the worker at the base, scoped to every locale', () => {
    expect(workerAt('/')).toEqual({ url: '/sw.js', scope: '/' });
    expect(workerAt('/ventana')).toEqual({ url: '/ventana/sw.js', scope: '/ventana/' });
  });

  it('reads the sync date the worker recorded, or none', async () => {
    const url = syncUrl('/ventana', 'https://host.test');
    expect(url).toBe('https://host.test/ventana/__ventana-synced-at');
    const storage = (body: string | null) =>
      ({ match: async () => (body === null ? undefined : new Response(body)) }) as unknown as CacheStorage;
    expect(await syncedAt(storage('1793000000000'), url)).toBe(1_793_000_000_000);
    expect(await syncedAt(storage(null), url)).toBeNull();
    expect(await syncedAt(storage('garbage'), url)).toBeNull();
    expect(await syncedAt(undefined, url)).toBeNull();
  });

  it('writes the date in the visitor’s language', () => {
    const atMs = Date.UTC(2026, 9, 31, 12);
    expect(syncDate('es-ES', atMs)).toBe('31 de octubre de 2026');
    expect(syncDate('de-DE', atMs)).toBe('31. Oktober 2026');
  });
});
