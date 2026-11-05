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
 * The build's hash of each file the worker may keep (VENT-90), put in
 * `__SW_CONFIG__` by scripts/service-worker.mjs: the first 16 hex digits
 * of the sha256 of its bytes. A kept copy is reused by a new build only
 * when its body hashes to that, never on a label: a script on the origin
 * could put any label on a copy, and a copy kept by an older worker may
 * hold bytes of another build than the worker's (seguridad, VENT-90).
 */
import { underScope } from './sw-routes';

/** A short sha256 of each file's bytes, keyed by its path under scope. */
export type Hashes = Readonly<Record<string, string>>;

/** The SHA-256 of `data` (the worker's `crypto.subtle.digest`). */
export type Digest = (data: ArrayBuffer) => Promise<ArrayBuffer>;

/** The length of a file's hash in hex digits, as the build writes it. */
const HASH_HEX = 16;

/** The build's hash of the file `url` asks for, if the build knows it. */
export function hashFor(
  hashes: Hashes,
  url: URL,
  scope: URL,
): string | undefined {
  const path = underScope(url, scope);
  return path === null ? undefined : hashes[path];
}

/** The hash of `bytes` as the build writes it. */
async function bytesHash(bytes: ArrayBuffer, digest: Digest) {
  const sum = new Uint8Array(await digest(bytes));
  const hex = [...sum].map((b) => b.toString(16).padStart(2, '0'));
  return hex.join('').slice(0, HASH_HEX);
}

/**
 * `kept`, read whole, when its body hashes to `hash`; else undefined.
 * Its headers do not count.
 */
export async function unchanged(
  kept: Response | undefined,
  hash: string,
  digest: Digest,
): Promise<Response | undefined> {
  if (!kept) return undefined;
  const bytes = await kept.arrayBuffer();
  if ((await bytesHash(bytes, digest)) !== hash) return undefined;
  const { status, statusText, headers } = kept;
  return new Response(bytes, { status, statusText, headers });
}
