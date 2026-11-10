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
 * What the service worker does with each request (sw-worker.ts), and the
 * names of its caches. Pure, so the rules are tested without a worker.
 *
 * - `html`: a page (a locale's shell), network first, the cache offline;
 * - `static`: a file of the build (scripts, styles, textures, icons),
 *   cache first;
 * - `api`: a GET of the API, network first, the last answer offline: the
 *   API sits at the domain's root (`/api/`), outside the app's scope since
 *   the app moved under /app (VENT-109);
 * - `bypass`: left to the browser: another origin, the pseudo-locale's
 *   page (never offered, never cached) and the worker's own script.
 */

import { API_ROOT } from '../lib/api-path';

export type SwRoute = 'html' | 'static' | 'api' | 'bypass';

/** The build's files, cached whole, under a name that changes with them. */
export const STATIC_PREFIX = 'ventana-static-';
/** The API's answers: kept across deploys, dropped on a schema change. */
export const API_CACHE = 'ventana-api-v1';
/** The entry in API_CACHE that holds when the API last answered. */
export const SYNC_ENTRY = '__ventana-synced-at';
/** The header the worker stamps on each answer it keeps. */
export const FETCHED_AT_HEADER = 'x-ventana-fetched-at';

/** The pseudo-locale's folder (i18n/locales.ts), lower-cased as routed. */
const NEVER_CACHED = ['en-xa/', 'sw.js'];

/** The path of `url` under `scope`, or null outside it. */
export function underScope(url: URL, scope: URL): string | null {
  if (url.origin !== scope.origin) return null;
  if (!url.pathname.startsWith(scope.pathname)) return null;
  return url.pathname.slice(scope.pathname.length);
}

/** The route of a GET for `url` from a page under `scope`. */
export function routeOf(url: URL, scope: URL, navigate = false): SwRoute {
  const sameOrigin = url.origin === scope.origin;
  if (sameOrigin && url.pathname.startsWith(API_ROOT)) return 'api';
  const path = underScope(url, scope);
  if (path === null) return 'bypass';
  if (NEVER_CACHED.some((p) => path === p || path.startsWith(p))) {
    return 'bypass';
  }
  const page = path === '' || path.endsWith('/') || path.endsWith('.html');
  return navigate || page ? 'html' : 'static';
}

/** The static cache of the build whose files hash to `digest`. */
export function staticCacheName(digest: string): string {
  return `${STATIC_PREFIX}${digest.slice(0, 12)}`;
}

/** The static caches of older builds, to delete once this one runs. */
export function staleCaches(names: readonly string[], current: string) {
  return names.filter((n) => n.startsWith(STATIC_PREFIX) && n !== current);
}

/**
 * The install's requests for `paths` under `scope`, past the HTTP cache:
 * a stale copy there would be kept for the whole build.
 */
export function precacheRequests(
  paths: readonly string[],
  scope: URL,
): Request[] {
  const reload = { cache: 'reload' } as const;
  return paths.map((p) => new Request(new URL(p, scope), reload));
}
