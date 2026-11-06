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
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  assertPrecacheBudget,
  DEVICE_EXTRAS,
  PRECACHE_BUDGET,
  precached,
  precacheOf,
  requestPath,
} from '../scripts/service-worker.mjs';
import { levelUrls } from '../src/globe/texture-lod';
import { syncDate, syncedAt, syncUrl } from '../src/pwa/offline-status';
import { registerServiceWorker, workerAt } from '../src/pwa/register-sw';
import { API_ENTRIES, apiFirst } from '../src/pwa/sw-api';
import {
  API_CACHE,
  FETCHED_AT_HEADER,
  precacheRequests,
  routeOf,
  staleCaches,
  staticCacheName,
  STATIC_PREFIX,
} from '../src/pwa/sw-routes';
import { cacheFirst, networkFirst, type SwNet } from '../src/pwa/sw-strategies';

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
  'icons/icon-192.png': 'i',
  'icons/apple-touch-icon.png': 't',
  'icons/phase/moon-00.webp': 'w',
  'apple-touch-icon.png': 't',
  'favicon.ico': 'f',
  'thumbs/im2-athena-320.webp': 'th',
  'textures/moon-lroc-1k.jpg': '1k',
  'textures/moon-lroc-2k.jpg': '2k',
  'textures/moon-lola-normal-2k.jpg': 'n2k',
  'textures/moon-south-polar-2k.jpg': 'polar',
  'textures/moon-lroc-4k.jpg': '4k',
  'textures/moon-lroc-8k.jpg': '8k',
  'sw.js': 'worker',
};

describe('precache', () => {
  it('leaves the on-foot 3D view’s files to the runtime cache (VENT-34)', () => {
    for (const file of ['_astro/TerrainPanel.Ab1.js', '_astro/terrain-scene.Ab1.js', '_astro/on-foot.Ab1.css']) {
      expect(precached(file)).toBe(false);
    }
    expect(precached('_astro/LunarApp.Ab1.js')).toBe(true);
  });

  it('leaves the fine real-relief tiles to the runtime cache (VENT-62)', () => {
    for (const file of ['fine-tiles/mons-mouton/heights.png', 'fine-tiles/mons-mouton/mask.png', 'fine-tiles/malapert-a/tile.json']) {
      expect(precached(file)).toBe(false);
    }
  });

  it('leaves the dev tools that ?debug loads to the runtime cache (VENT-49)', () => {
    for (const file of ['_astro/boot.Ab1.js', '_astro/perf-hud.Ab1.css', '_astro/spector.bundle.Ab1.js']) {
      expect(precached(file)).toBe(false);
    }
    expect(precached('_astro/dev-tools-loader.Ab1.js')).toBe(true);
  });

  it('caches the common offline set at install: pages, build files, manifests, icons, phase frames, thumbnails, 1K and 2K maps', () => {
    expect(precacheOf(dist(BUILD)).precache.toSorted()).toEqual([
      '',
      '_astro/app.1.js',
      'apple-touch-icon.png',
      'es/',
      'es/manifest.webmanifest',
      'favicon.ico',
      'icons/apple-touch-icon.png',
      'icons/icon-192.png',
      'icons/phase/moon-00.webp',
      'textures/moon-lola-normal-2k.jpg',
      'textures/moon-lroc-1k.jpg',
      'textures/moon-lroc-2k.jpg',
      'thumbs/im2-athena-320.webp',
    ]);
    for (const file of ['en-xa/index.html', 'textures/moon-lroc-4k.jpg', 'textures/moon-lroc-8k.jpg', 'sw.js']) {
      expect(precached(file)).toBe(false);
    }
    expect(requestPath('de/index.html')).toBe('de/');
  });

  it('counts the bytes of the install set only', () => {
    const precachedBodies = ['en', 'es', '{}', 'js', 'i', 't', 'w', 't', 'f', 'th', '1k', '2k', 'n2k'];
    const expected = precachedBodies.join('').length;
    expect(precacheOf(dist(BUILD)).bytes).toBe(expected);
  });

  it('installs the 1K and 2K globe maps on every device, and leaves the polar map out: a phone has no polar view (VENT-95)', () => {
    for (const level of [1, 2] as const) {
      const { colour, normal } = levelUrls(level, '/');
      expect(precached(colour.slice(1))).toBe(true);
      expect(precached(normal.slice(1))).toBe(true);
    }
    expect(precached('textures/moon-south-polar-2k.jpg')).toBe(false);
  });

  it('names the desktop extras in one place: the polar map alone (VENT-95)', () => {
    expect(DEVICE_EXTRAS).toEqual({ desktop: ['textures/moon-south-polar-2k.jpg'] });
    const polar = readFileSync(new URL('../src/components/polar/PolarMap.tsx', import.meta.url), 'utf8');
    expect(polar).toContain(`'${DEVICE_EXTRAS.desktop[0]}'`);
  });

  it('hands the worker the desktop extras with their hashes, and counts their bytes apart (VENT-95)', () => {
    const built = precacheOf(dist(BUILD));
    expect(built.extras).toEqual(DEVICE_EXTRAS);
    expect(built.extraBytes).toEqual({ desktop: 'polar'.length });
    for (const path of DEVICE_EXTRAS.desktop) expect(built.hashes[path]).toMatch(/^[0-9a-f]{16}$/);
  });

  it('holds the budget to the largest first install: the common set plus the desktop extras (VENT-95)', () => {
    const half = 'x'.repeat(PRECACHE_BUDGET / 2);
    const fits = precacheOf(dist({ ...BUILD, 'thumbs/big-640.webp': half }));
    expect(() => assertPrecacheBudget(fits.bytes, fits.extraBytes)).not.toThrow();
    const over = precacheOf(dist({ ...BUILD, 'thumbs/big-640.webp': half, 'textures/moon-south-polar-2k.jpg': half }));
    expect(over.bytes).toBeLessThan(PRECACHE_BUDGET);
    expect(() => assertPrecacheBudget(over.bytes, over.extraBytes)).toThrow(/desktop/);
  });

  it('changes the digest, and so the cache name, when any file the worker may keep changes', () => {
    const before = precacheOf(dist(BUILD)).digest;
    expect(precacheOf(dist(BUILD)).digest).toBe(before);
    expect(precacheOf(dist({ ...BUILD, '_astro/app.1.js': 'js2' })).digest).not.toBe(before);
    // Maps are kept at runtime under the same cache, so a new map must name a new cache.
    expect(precacheOf(dist({ ...BUILD, 'textures/moon-lroc-8k.jpg': 'other' })).digest).not.toBe(before);
    expect(precacheOf(dist({ ...BUILD, 'sw.js': 'other worker' })).digest).toBe(before);
  });

  it('fails the build over the 5 MB budget and passes at or under it', () => {
    expect(PRECACHE_BUDGET).toBe(5 * 1024 * 1024);
    expect(() => assertPrecacheBudget(PRECACHE_BUDGET + 1)).toThrow(/over its 5\.00 MB budget/);
    expect(() => assertPrecacheBudget(PRECACHE_BUDGET)).not.toThrow();
    expect(() => assertPrecacheBudget(PRECACHE_BUDGET - 1)).not.toThrow();
  });

  it('measures a real dist against the budget: an oversized thumbnail turns it red', () => {
    const under = precacheOf(dist(BUILD)).bytes;
    expect(() => assertPrecacheBudget(under)).not.toThrow();
    const big = 'x'.repeat(PRECACHE_BUDGET);
    const over = precacheOf(dist({ ...BUILD, 'thumbs/huge-640.webp': big })).bytes;
    expect(over).toBeGreaterThan(PRECACHE_BUDGET);
    expect(() => assertPrecacheBudget(over)).toThrow();
    // A sharper map is never precached, so it never counts against the budget.
    const zoom = precacheOf(dist({ ...BUILD, 'textures/moon-lroc-8k.jpg': big })).bytes;
    expect(() => assertPrecacheBudget(zoom)).not.toThrow();
  });

  it('asks the server, not the HTTP cache, for every file at install', () => {
    const requests = precacheRequests(['', 'es/'], SCOPE);
    expect(requests.map((r) => r.url)).toEqual(['https://ventana.test/', 'https://ventana.test/es/']);
    expect(requests.every((r) => r.cache === 'reload')).toBe(true);
  });
});

/**
 * An in-memory cache storage and a scripted network; after `fillQuota` every write fails as a full quota does. The copies
 * are kept after the answer (VENT-90): `settled` waits for them.
 */
function fakeNet(answer: () => Promise<Response>) {
  let failPut = false;
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
      put: async (req: RequestInfo | URL, res: Response) => {
        if (failPut) throw new DOMException('quota', 'QuotaExceededError');
        store.set(keyOf(req), res);
      },
      keys: async () => [...store.keys()].map((k) => new Request(k)),
      delete: async (req: RequestInfo | URL) => store.delete(keyOf(req)),
      match: async (req: RequestInfo | URL, opts?: { ignoreSearch?: boolean }) =>
        store.get(keyOf(req, opts?.ignoreSearch))?.clone() ??
        [...store.entries()].find(([k]) => opts?.ignoreSearch && keyOf(k, true) === keyOf(req, true))?.[1].clone(),
    };
  };
  const caches = { open } as unknown as CacheStorage;
  const pending: Promise<unknown>[] = [];
  const defer = (work: Promise<unknown>) => {
    pending.push(work);
  };
  const net: SwNet = { caches, fetch: () => answer(), now: () => 1_793_000_000_000, defer };
  const fillQuota = () => {
    failPut = true;
  };
  const settled = () => Promise.all(pending);
  return { net, stores, fillQuota, settled };
}

const ok = (body: string) => () => Promise.resolve(new Response(body));
const down = () => Promise.reject(new TypeError('offline'));
const failing = (status: number) => () => Promise.resolve(new Response('error', { status }));

/** A response that followed a redirect, as `fetch` gives it (a constructed Response never has `redirected`). */
function redirected(body: string): Response {
  const mark = (r: Response): Response => {
    Object.defineProperty(r, 'redirected', { value: true });
    const clone = r.clone.bind(r);
    r.clone = () => mark(clone());
    return r;
  };
  return mark(new Response(body));
}

describe('strategies', () => {
  it('network first keeps the answer and serves it offline, ignoring a page’s `?site=`', async () => {
    const online = fakeNet(ok('page'));
    const keep = { cache: 'c', ignoreSearch: true };
    await networkFirst(online.net, new Request('https://ventana.test/es/'), keep);
    await online.settled();
    const offline = { ...online.net, fetch: down };
    const res = await networkFirst(offline, new Request('https://ventana.test/es/?site=apollo11'), keep);
    expect(await res.text()).toBe('page');
  });

  it('network first fails as the network does when nothing is kept', async () => {
    const { net } = fakeNet(down);
    await expect(networkFirst(net, new Request('https://ventana.test/fr/'), { cache: 'c' })).rejects.toThrow('offline');
  });

  it('network first answers with the network even when keeping the copy fails (a full quota)', async () => {
    const { net, stores, fillQuota, settled } = fakeNet(ok('stale'));
    const keep = { cache: 'c' };
    const request = () => new Request('https://ventana.test/fr/');
    await networkFirst(net, request(), keep);
    await settled();
    fillQuota();
    const res = await networkFirst({ ...net, fetch: ok('fresh') }, request(), keep);
    expect(await res.text()).toBe('fresh');
    await settled();
    expect(stores.get('c')?.size).toBe(1);
  });

  it('network first never keeps an answer that is not ok', async () => {
    const { net, stores, settled } = fakeNet(failing(500));
    const res = await networkFirst(net, new Request('https://ventana.test/fr/'), { cache: 'c' });
    expect(res.status).toBe(500);
    await settled();
    expect(stores.get('c')?.size ?? 0).toBe(0);
  });

  it('keeps one copy of a page whatever its query string', async () => {
    const { net, stores, settled } = fakeNet(ok('page'));
    const keep = { cache: 'c', ignoreSearch: true };
    for (const q of ['?x=1', '?x=2', '?site=apollo11']) {
      await networkFirst(net, new Request(`https://ventana.test/es/${q}`), keep);
    }
    await settled();
    expect([...(stores.get('c')?.keys() ?? [])]).toEqual(['https://ventana.test/es/']);
  });

  it('never keeps a page as a redirected answer, so offline it can be served to a navigation', async () => {
    const { net, stores, settled } = fakeNet(() => Promise.resolve(redirected('final page')));
    const keep = { cache: 'c', ignoreSearch: true };
    const res = await networkFirst(net, new Request('https://ventana.test/es'), keep);
    expect(await res.text()).toBe('final page');
    await settled();
    const kept = stores.get('c')?.get('https://ventana.test/es');
    expect(kept?.redirected).toBe(false);
    expect(await kept?.text()).toBe('final page');
  });

  it('cache first never keeps an answer that is not ok, and asks again next time', async () => {
    let asked = 0;
    const { net, stores, settled } = fakeNet(() => {
      asked += 1;
      return failing(404)();
    });
    const request = () => new Request('https://ventana.test/textures/moon-lroc-4k.jpg');
    expect((await cacheFirst(net, request(), 'c')).status).toBe(404);
    await settled();
    await cacheFirst(net, request(), 'c');
    expect(asked).toBe(2);
    expect(stores.get('c')?.size ?? 0).toBe(0);
  });

  it('cache first answers with the network even when keeping the copy fails', async () => {
    const { net, fillQuota, settled } = fakeNet(ok('map'));
    fillQuota();
    const res = await cacheFirst(net, new Request('https://ventana.test/textures/moon-lroc-4k.jpg'), 'c');
    expect(await res.text()).toBe('map');
    await expect(settled()).resolves.toBeDefined();
  });

  it('cache first answers from the cache without asking the network again', async () => {
    let asked = 0;
    const { net, settled } = fakeNet(() => {
      asked += 1;
      return Promise.resolve(new Response('map'));
    });
    const request = () => new Request('https://ventana.test/textures/moon-lroc-4k.jpg');
    await cacheFirst(net, request(), 'c');
    await settled();
    expect(await (await cacheFirst(net, request(), 'c')).text()).toBe('map');
    expect(asked).toBe(1);
  });

  it('the API’s answers are stamped and the sync entry records when', async () => {
    const online = fakeNet(ok('{"hours":[]}'));
    const keep = { cache: API_CACHE, syncUrl: 'https://ventana.test/__ventana-synced-at' };
    const url = 'https://ventana.test/api/v1/sites/apollo11?from=a&to=b';
    await apiFirst(online.net, new Request(url), keep);
    await online.settled();
    const kept = await apiFirst({ ...online.net, fetch: down }, new Request(url), keep);
    expect(kept.headers.get(FETCHED_AT_HEADER)).toBe('1793000000000');
    expect(await kept.text()).toBe('{"hours":[]}');
    const sync = await online.stores.get(API_CACHE)?.get(keep.syncUrl)?.text();
    expect(sync).toBe('1793000000000');
  });

  // VENT-98: a binary terrain tile is kept and served offline as a JSON one is, byte for byte, with its type.
  it('keeps a binary terrain tile as it keeps JSON, and serves it offline unchanged', async () => {
    const bytes = Uint8Array.from({ length: 4096 }, (_, i) => (i * 37) % 256);
    const headers = { 'content-type': 'application/octet-stream' };
    const online = fakeNet(() => Promise.resolve(new Response(bytes, { headers })));
    const keep = { cache: API_CACHE, syncUrl: 'https://ventana.test/__ventana-synced-at' };
    const url = 'https://ventana.test/api/v1/terrain/tiles/polar-south/0/37/67?v=57129b75&format=bin';
    await apiFirst(online.net, new Request(url), keep);
    await online.settled();
    const kept = await apiFirst({ ...online.net, fetch: down }, new Request(url), keep);
    expect(kept.headers.get('content-type')).toBe('application/octet-stream');
    expect(new Uint8Array(await kept.arrayBuffer())).toEqual(bytes);
  });
});

describe('the API cache', () => {
  it(`keeps at most ${API_ENTRIES} answers, dropping the oldest by when they came`, async () => {
    let clock = 1_793_000_000_000;
    const { net, stores, settled } = fakeNet(ok('{"hours":[]}'));
    const ticking: SwNet = { ...net, now: () => (clock += 1000) };
    const keep = { cache: API_CACHE, syncUrl: 'https://ventana.test/__ventana-synced-at' };
    const url = (i: number) => `https://ventana.test/api/v1/sites/s${i}?from=a&to=b`;
    for (let i = 0; i < API_ENTRIES + 6; i += 1) {
      await apiFirst(ticking, new Request(url(i)), keep);
      await settled();
    }
    const store = stores.get(API_CACHE)!;
    expect(store.size).toBe(API_ENTRIES + 1);
    expect(store.has(keep.syncUrl)).toBe(true);
    expect(store.has(url(5))).toBe(false);
    expect(store.has(url(6))).toBe(true);
    expect(store.has(url(API_ENTRIES + 5))).toBe(true);
  });
});

describe('the page side', () => {
  it('registers no worker when the browser asks to save data', () => {
    const register = vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration));
    const container = { register } as unknown as ServiceWorkerContainer;
    registerServiceWorker('/', container, true);
    expect(register).not.toHaveBeenCalled();
    registerServiceWorker('/', container, false);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

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
