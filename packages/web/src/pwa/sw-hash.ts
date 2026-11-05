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

import { underScope } from './sw-routes';
import type { Stamp } from './sw-strategies';

/** The header that carries a kept copy's hash. */
export const HASH_HEADER = 'x-ventana-hash';

/** A short sha256 of each file's bytes, keyed by its path under scope. */
export type Hashes = Readonly<Record<string, string>>;

/** The build's hash of the file `url` asks for, if the build knows it. */
export function hashFor(
  hashes: Hashes,
  url: URL,
  scope: URL,
): string | undefined {
  const path = underScope(url, scope);
  return path === null ? undefined : hashes[path];
}

/** `response` carrying `hash`; the body streams through, never read. */
export function withHash(response: Response, hash: string): Response {
  const headers = new Headers(response.headers);
  headers.set(HASH_HEADER, hash);
  const { status, statusText } = response;
  return new Response(response.body, { status, statusText, headers });
}

/** Whether a kept copy carries `hash`. */
export function holdsHash(
  kept: Response | undefined,
  hash: string,
): kept is Response {
  return kept?.headers.get(HASH_HEADER) === hash;
}

/** Stamps each kept copy with its build's hash, when the build has one. */
export function hashStamp(hashes: Hashes, scope: URL): Stamp {
  return async (copy, request) => {
    const hash = hashFor(hashes, new URL(request.url), scope);
    return hash === undefined ? copy : withHash(copy, hash);
  };
}
