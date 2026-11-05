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
 * A new build's install and activation (VENT-90): a deploy downloads only
 * the files that changed. The install fills the build's static cache with
 * the offline set, copying from an older build's cache each file whose
 * kept body still hashes to the build's hash and asking the server for
 * the rest; it is all or nothing, as `addAll` was. The activation carries
 * over what the older builds kept on use (the 4K and 8K maps, the
 * on-demand chunks) on the same test, then deletes their caches. Hashing
 * the kept bodies costs the worker a read of each, off the main thread.
 */
import { hashFor, unchanged, type Digest, type Hashes } from './sw-hash';
import { precacheRequests, staleCaches } from './sw-routes';

/** What the install and the activation reach: the caches and the network. */
export interface Store {
  readonly caches: CacheStorage;
  readonly fetch: (request: Request) => Promise<Response>;
  readonly digest: Digest;
}

/** The build being installed: its static cache, hashes and scope. */
export interface Build {
  readonly cache: string;
  readonly hashes: Hashes;
  readonly scope: URL;
}

/** A kept copy of `url` whose body hashes to `hash`, in `sources`. */
async function unchangedCopy(
  store: Store,
  sources: readonly string[],
  url: string,
  hash: string,
): Promise<Response | undefined> {
  for (const name of sources) {
    const cache = await store.caches.open(name);
    // Same path and hash are the same bytes, whatever the request varied on.
    const kept = await cache.match(url, { ignoreVary: true });
    const copy = await unchanged(kept, hash, store.digest);
    if (copy) return copy;
  }
  return undefined;
}

/** The copy the install keeps for `request`: an unchanged one, or fresh. */
async function precacheEntry(
  store: Store,
  build: Build,
  request: Request,
  sources: readonly string[],
): Promise<Response> {
  const hash = hashFor(build.hashes, new URL(request.url), build.scope);
  if (hash !== undefined) {
    const kept = await unchangedCopy(store, sources, request.url, hash);
    if (kept) return kept;
  }
  const response = await store.fetch(request);
  if (!response.ok) {
    throw new TypeError(`sw: ${request.url} answered ${response.status}`);
  }
  return response;
}

/**
 * Fills the build's cache with `paths` (under its scope). Fails as a
 * whole, its cache deleted, when any file cannot be had.
 */
export async function installBuild(
  store: Store,
  build: Build,
  paths: readonly string[],
): Promise<void> {
  const sources = staleCaches(await store.caches.keys(), build.cache);
  const requests = precacheRequests(paths, build.scope);
  try {
    const entries = await Promise.all(
      requests.map((r) => precacheEntry(store, build, r, sources)),
    );
    const cache = await store.caches.open(build.cache);
    await Promise.all(entries.map((e, i) => cache.put(requests[i]!, e)));
  } catch (error) {
    await store.caches.delete(build.cache);
    throw error;
  }
}

/** Copies into `target` the entries of `source` the build still has. */
async function carryOver(
  source: Cache,
  target: Cache,
  build: Build,
  digest: Digest,
): Promise<void> {
  for (const request of await source.keys()) {
    const hash = hashFor(build.hashes, new URL(request.url), build.scope);
    if (hash === undefined) continue;
    if (await target.match(request, { ignoreVary: true })) continue;
    const kept = await source.match(request, { ignoreVary: true });
    const copy = await unchanged(kept, hash, digest);
    if (copy) await target.put(request, copy);
  }
}

/**
 * Carries the older builds' unchanged copies into the build's cache (a
 * copy that cannot be stored is left behind), then deletes their caches.
 */
export async function activateBuild(store: Store, build: Build) {
  const stale = staleCaches(await store.caches.keys(), build.cache);
  const target = await store.caches.open(build.cache);
  for (const name of stale) {
    const source = await store.caches.open(name);
    const carried = carryOver(source, target, build, store.digest);
    await carried.catch(() => undefined);
  }
  await Promise.all(stale.map((name) => store.caches.delete(name)));
}
