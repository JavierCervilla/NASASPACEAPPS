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
 * The maps only some devices use (VENT-95): the build leaves them out of
 * the install set and names them by set (DEVICE_EXTRAS in
 * scripts/service-worker.mjs); a page that uses a set asks the worker to
 * keep it once it has started (keep-extras.ts). Each copy is kept only
 * when its body hashes to the build's hash, as the install does
 * (VENT-90), so a deploy carries it over when it did not change.
 */
import { unchanged } from './sw-hash';
import type { Build, Store } from './sw-reuse';

/** The message a page posts to ask for a set of extras. */
export const KEEP_EXTRAS = 'ventana:keep-extras';

/** The device extras by set name, as the build writes them. */
export type ExtrasSets = Readonly<Record<string, readonly string[]>>;

/** The paths `data` asks to keep: a known set's, else none. */
export function extrasAsked(
  data: unknown,
  sets: ExtrasSets,
): readonly string[] {
  if (typeof data !== 'object' || data === null) return [];
  const { type, set } = data as { type?: unknown; set?: unknown };
  if (type !== KEEP_EXTRAS || typeof set !== 'string') return [];
  return Object.hasOwn(sets, set) ? (sets[set] ?? []) : [];
}

/** `request`'s answer when it hashes to `hash`; else undefined. */
async function hashedAnswer(store: Store, request: Request, hash: string) {
  const response = await store.fetch(request).catch(() => undefined);
  if (!response?.ok) return undefined;
  return unchanged(response, hash, store.digest);
}

/**
 * Keeps `path` unless kept: the HTTP cache's copy (the page may have
 * just loaded it) when it hashes right, else the server's.
 */
async function keepOne(store: Store, build: Build, path: string) {
  const hash = build.hashes[path];
  if (hash === undefined) return;
  const url = new URL(path, build.scope);
  const cache = await store.caches.open(build.cache);
  if (await cache.match(url.href)) return;
  const reload = new Request(url, { cache: 'reload' });
  const copy =
    (await hashedAnswer(store, new Request(url), hash)) ??
    (await hashedAnswer(store, reload, hash));
  if (copy) await cache.put(url.href, copy);
}

/** Keeps each of `paths` it can; one that fails leaves the others. */
export async function keepExtras(
  store: Store,
  build: Build,
  paths: readonly string[],
): Promise<void> {
  for (const path of paths) {
    await keepOne(store, build, path).catch(() => undefined);
  }
}
