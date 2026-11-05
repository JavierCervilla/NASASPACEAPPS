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
 * VENT-90: the service worker answers before it keeps the copy, and a deploy downloads only the files that changed. The
 * build hashes every file the worker may keep; the install copies from the older build's cache each copy whose body
 * still hashes to the new build's hash, and the activation carries over what the zoom kept (the 4K and 8K maps) on the
 * same test. A header never decides it: a script on the origin can put any header on a copy (seguridad, VENT-90).
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { precacheOf } from '../scripts/service-worker.mjs';
import { activateBuild, installBuild } from '../src/pwa/sw-reuse';
import { staticCacheName } from '../src/pwa/sw-routes';
import { cacheFirst, networkFirst, type SwNet } from '../src/pwa/sw-strategies';

const SCOPE = new URL('https://ventana.test/');
const at = (path: string) => new URL(path, SCOPE).href;
const OLD = staticCacheName('aaaaaaaaaaaa');
const NEW = staticCacheName('bbbbbbbbbbbb');
/** The hash the build writes for `body`: the first 16 hex digits of its sha256. */
const h = (body: string) => createHash('sha256').update(body).digest('hex').slice(0, 16);
/** The label the first VENT-90 build stamped on kept copies; a lie here must never be believed. */
const CLAIM = 'x-ventana-hash';
const digest = (data: ArrayBuffer) => crypto.subtle.digest('SHA-256', data);

/** A promise and the hand that settles it. */
function gate() {
  let open: () => void = () => undefined;
  const shut = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { shut, open };
}

/** In-memory cache storage; while `hold` is set every `put` waits for it. */
function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const state: { hold?: Promise<void> } = {};
  const keyOf = (req: RequestInfo | URL) =>
    new URL(typeof req === 'string' || req instanceof URL ? req : req.url).href;
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      put: async (req: RequestInfo | URL, res: Response) => {
        await state.hold;
        store.set(keyOf(req), new Response(await res.blob(), res));
      },
      keys: async () => [...store.keys()].map((k) => new Request(k)),
      match: async (req: RequestInfo | URL) => store.get(keyOf(req))?.clone(),
    };
  };
  const caches = {
    open,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  } as unknown as CacheStorage;
  return { caches, stores, state };
}

/** Puts `files` (path to body) into the cache `name`; `claims` adds a hash header to some (path to the claimed hash). */
function seed(
  stores: Map<string, Map<string, Response>>,
  name: string,
  files: Record<string, string>,
  claims: Record<string, string> = {},
) {
  const store = stores.get(name) ?? new Map<string, Response>();
  stores.set(name, store);
  for (const [path, body] of Object.entries(files)) {
    const headers: Record<string, string> = path in claims ? { [CLAIM]: claims[path]! } : {};
    store.set(at(path), new Response(body, { headers }));
  }
}

/** A network that serves `bodies` by path and counts what it was asked. */
function fakeServer(bodies: Record<string, string>, failing: readonly string[] = []) {
  const asked: string[] = [];
  const fetch = async (request: Request) => {
    const path = new URL(request.url).pathname.slice(1);
    asked.push(path);
    if (failing.includes(path)) throw new TypeError('offline');
    return new Response(bodies[path] ?? 'missing', { status: path in bodies ? 200 : 404 });
  };
  return { fetch, asked };
}

describe('answer first (VENT-90)', () => {
  function setup() {
    const { caches, stores, state } = fakeCaches();
    const deferred: Promise<unknown>[] = [];
    const net: SwNet = {
      caches,
      fetch: async () => new Response('fresh map'),
      now: () => 0,
      defer: (promise) => {
        deferred.push(promise);
      },
    };
    return { net, stores, state, deferred };
  }

  it('cache first answers before the copy is stored, and the copy lands through `defer`', async () => {
    const { net, stores, state, deferred } = setup();
    const { shut, open } = gate();
    state.hold = shut;
    const request = new Request(at('textures/moon-lroc-4k.jpg'));
    const response = await cacheFirst(net, request, 'c');
    expect(await response.text()).toBe('fresh map');
    expect(stores.get('c')?.size ?? 0).toBe(0);
    expect(deferred).toHaveLength(1);
    open();
    await Promise.all(deferred);
    expect(await stores.get('c')?.get(request.url)?.text()).toBe('fresh map');
  });

  it('network first answers before the copy is stored, and the copy lands through `defer`', async () => {
    const { net, stores, state, deferred } = setup();
    const { shut, open } = gate();
    state.hold = shut;
    const response = await networkFirst(net, new Request(at('es/?site=apollo11')), { cache: 'c', ignoreSearch: true });
    expect(await response.text()).toBe('fresh map');
    expect(stores.get('c')?.size ?? 0).toBe(0);
    open();
    await Promise.all(deferred);
    expect([...(stores.get('c')?.keys() ?? [])]).toEqual([at('es/')]);
  });

});

const NEXT = {
  cache: NEW,
  scope: SCOPE,
  hashes: { '': h('new page'), '_astro/app.2.js': h('app2'), 'textures/moon-lroc-2k.jpg': h('2k'), 'textures/moon-lroc-4k.jpg': h('4k') },
};
const PRECACHE = ['', '_astro/app.2.js', 'textures/moon-lroc-2k.jpg'];

describe('install reuses what did not change (VENT-90)', () => {
  it('copies the files whose body did not change from the older cache and downloads only the changed ones', async () => {
    const { caches, stores } = fakeCaches();
    seed(stores, OLD, { '': 'old page', 'textures/moon-lroc-2k.jpg': '2k' });
    const server = fakeServer({ '': 'new page', '_astro/app.2.js': 'app2', 'textures/moon-lroc-2k.jpg': '2k' });
    await installBuild({ caches, fetch: server.fetch, digest }, NEXT, PRECACHE);
    expect(server.asked.toSorted()).toEqual(['', '_astro/app.2.js']);
    const kept = stores.get(NEW)!;
    expect(await kept.get(at(''))?.text()).toBe('new page');
    expect(await kept.get(at('_astro/app.2.js'))?.text()).toBe('app2');
    expect(await kept.get(at('textures/moon-lroc-2k.jpg'))?.text()).toBe('2k');
  });

  it('never believes a header: a copy that claims the new hash with another body is downloaded again', async () => {
    const { caches, stores } = fakeCaches();
    seed(stores, OLD, { '_astro/app.2.js': 'evil', 'textures/moon-lroc-2k.jpg': '2k' }, { '_astro/app.2.js': h('app2') });
    const server = fakeServer({ '': 'new page', '_astro/app.2.js': 'app2', 'textures/moon-lroc-2k.jpg': '2k' });
    await installBuild({ caches, fetch: server.fetch, digest }, NEXT, PRECACHE);
    expect(server.asked.toSorted()).toEqual(['', '_astro/app.2.js']);
    expect(await stores.get(NEW)!.get(at('_astro/app.2.js'))?.text()).toBe('app2');
  });

  it('asks the server, not the HTTP cache, for what it downloads', async () => {
    const { caches } = fakeCaches();
    const modes: RequestCache[] = [];
    const fetch = async (request: Request) => {
      modes.push(request.cache);
      return new Response('x');
    };
    await installBuild({ caches, fetch, digest }, NEXT, PRECACHE);
    expect(modes).toEqual(['reload', 'reload', 'reload']);
  });

  it('fails as a whole when one file cannot be had, leaving no new cache', async () => {
    const { caches, stores } = fakeCaches();
    const server = fakeServer({ '': 'new page', 'textures/moon-lroc-2k.jpg': '2k' }, ['_astro/app.2.js']);
    await expect(installBuild({ caches, fetch: server.fetch, digest }, NEXT, PRECACHE)).rejects.toThrow();
    expect(stores.has(NEW)).toBe(false);
  });

  it('deletes the new cache when the copies cannot be stored (a full quota)', async () => {
    const { caches, stores, state } = fakeCaches();
    const server = fakeServer({ '': 'new page', '_astro/app.2.js': 'app2', 'textures/moon-lroc-2k.jpg': '2k' });
    state.hold = Promise.reject(new DOMException('quota', 'QuotaExceededError'));
    state.hold.catch(() => undefined);
    await expect(installBuild({ caches, fetch: server.fetch, digest }, NEXT, PRECACHE)).rejects.toThrow('quota');
    expect(stores.has(NEW)).toBe(false);
  });

  it('fails when the server answers an error for a needed file', async () => {
    const { caches, stores } = fakeCaches();
    const server = fakeServer({ '': 'new page', '_astro/app.2.js': 'app2' });
    await expect(installBuild({ caches, fetch: server.fetch, digest }, NEXT, PRECACHE)).rejects.toThrow();
    expect(stores.has(NEW)).toBe(false);
  });
});

describe('activate carries over what the zoom kept (VENT-90)', () => {
  it('carries an unchanged runtime file, drops a changed one, and deletes the stale caches', async () => {
    const { caches, stores } = fakeCaches();
    seed(stores, OLD, {
      'textures/moon-lroc-4k.jpg': '4k',
      'textures/moon-lroc-8k.jpg': '8k',
      '_astro/app.1.js': 'app1',
      '': 'old page',
    });
    seed(stores, NEW, { '': 'new page' });
    seed(stores, 'ventana-api-v1', { 'api/v1/sites': '[]' });
    const next = { ...NEXT, hashes: { ...NEXT.hashes, 'textures/moon-lroc-8k.jpg': h('8k new') } };
    await activateBuild({ caches, fetch: fakeServer({}).fetch, digest }, next);
    expect(stores.has(OLD)).toBe(false);
    expect(stores.has('ventana-api-v1')).toBe(true);
    const kept = stores.get(NEW)!;
    expect(await kept.get(at('textures/moon-lroc-4k.jpg'))?.text()).toBe('4k');
    expect(kept.has(at('textures/moon-lroc-8k.jpg'))).toBe(false);
    expect(kept.has(at('_astro/app.1.js'))).toBe(false);
    expect(await kept.get(at(''))?.text()).toBe('new page');
  });

  it('never believes a header: a copy that claims the new hash with another body is left behind', async () => {
    const { caches, stores } = fakeCaches();
    const claims = { 'textures/moon-lroc-4k.jpg': h('4k') };
    seed(stores, OLD, { 'textures/moon-lroc-4k.jpg': 'evil' }, claims);
    await activateBuild({ caches, fetch: fakeServer({}).fetch, digest }, NEXT);
    expect(stores.get(NEW)!.has(at('textures/moon-lroc-4k.jpg'))).toBe(false);
    expect(stores.has(OLD)).toBe(false);
  });

  it('still deletes the stale caches when a carried copy cannot be stored', async () => {
    const { caches, stores, state } = fakeCaches();
    seed(stores, OLD, { 'textures/moon-lroc-4k.jpg': '4k' });
    state.hold = Promise.reject(new DOMException('quota', 'QuotaExceededError'));
    state.hold.catch(() => undefined);
    await activateBuild({ caches, fetch: fakeServer({}).fetch, digest }, NEXT);
    expect(stores.has(OLD)).toBe(false);
  });
});

describe('the build hashes every file the worker may keep (VENT-90)', () => {
  function dist(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'sw-hashes-'));
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    return dir;
  }
  const BUILD = {
    'index.html': 'en',
    'es/index.html': 'es',
    'en-xa/index.html': 'pseudo',
    '_astro/app.1.js': 'js',
    '_astro/TerrainPanel.Ab1.js': 'panel',
    'textures/moon-lroc-2k.jpg': '2k',
    'textures/moon-lroc-4k.jpg': '4k',
    'sw.js': 'worker',
  };

  it('keys a short sha256 of each keepable file by its request path, the 4K map and on-demand chunks included', () => {
    const { hashes } = precacheOf(dist(BUILD));
    expect(Object.keys(hashes).toSorted()).toEqual([
      '',
      '_astro/TerrainPanel.Ab1.js',
      '_astro/app.1.js',
      'es/',
      'textures/moon-lroc-2k.jpg',
      'textures/moon-lroc-4k.jpg',
    ]);
    // sha256('4k'), first 16 hex digits.
    expect(hashes['textures/moon-lroc-4k.jpg']).toBe('4d935684ea949718');
    expect(Object.values(hashes).every((h) => /^[0-9a-f]{16}$/.test(h))).toBe(true);
  });

  it('changes only the hash of the file that changed', () => {
    const before = precacheOf(dist(BUILD)).hashes;
    const after = precacheOf(dist({ ...BUILD, '_astro/app.1.js': 'js2' })).hashes;
    expect(after['_astro/app.1.js']).not.toBe(before['_astro/app.1.js']);
    expect({ ...after, '_astro/app.1.js': '' }).toEqual({ ...before, '_astro/app.1.js': '' });
  });
});
