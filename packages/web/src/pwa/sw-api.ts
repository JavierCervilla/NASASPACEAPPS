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
 * The API's answers in the service worker: network first, each kept
 * answer stamped with when it came (so the page can say «data from
 * <date>» offline), and at most API_ENTRIES of them kept.
 */
import { FETCHED_AT_HEADER } from './sw-routes';
import { networkFirst, type Keep, type SwNet } from './sw-strategies';

/** As many answers as the page's hours cache holds (hours-cache.ts). */
export const API_ENTRIES = 24;

/** `response` with the instant it was fetched in FETCHED_AT_HEADER. */
export async function stamped(
  response: Response,
  atMs: number,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set(FETCHED_AT_HEADER, String(atMs));
  const body = await response.blob();
  const { status, statusText } = response;
  return new Response(body, { status, statusText, headers });
}

/** Drops all but the `max` latest answers in `cache`, by their stamp. */
export async function pruneAnswers(
  cache: Cache,
  syncUrl: string,
  max: number,
): Promise<void> {
  const requests = await cache.keys();
  const answers = requests.filter((r) => r.url !== syncUrl);
  const dated = await Promise.all(
    answers.map(async (request) => {
      const kept = await cache.match(request);
      const at = Number(kept?.headers.get(FETCHED_AT_HEADER) ?? 0);
      return { request, at: Number.isFinite(at) ? at : 0 };
    }),
  );
  const oldest = dated.sort((a, b) => b.at - a.at).slice(max);
  await Promise.all(oldest.map(({ request }) => cache.delete(request)));
}

/**
 * The API's answer, network first; each kept answer is stamped, the
 * sync entry (`syncUrl`) records the latest, and only the API_ENTRIES
 * latest answers stay.
 */
export async function apiFirst(
  net: SwNet,
  request: Request,
  keep: Keep & { readonly syncUrl: string },
): Promise<Response> {
  const cache = await net.caches.open(keep.cache);
  const response = await networkFirst(net, request, keep, async (copy) => {
    const atMs = net.now();
    await cache.put(keep.syncUrl, new Response(String(atMs)));
    return stamped(copy, atMs);
  });
  await pruneAnswers(cache, keep.syncUrl, API_ENTRIES).catch(() => undefined);
  return response;
}
