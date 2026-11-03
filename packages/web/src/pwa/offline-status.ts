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
 * When the API last answered, as the service worker recorded it
 * (sw-strategies.ts): the date the offline notice gives for the data on
 * screen. The cache storage comes in; null when there is none or no
 * answer was ever kept.
 */
import { SYNC_ENTRY } from './sw-routes';

/** The sync entry's address for the site at `base` on `origin`. */
export function syncUrl(base: string, origin: string): string {
  const scope = new URL(base.replace(/\/?$/, '/'), origin);
  return new URL(SYNC_ENTRY, scope).href;
}

/** The instant (Unix ms) the API last answered, or null. */
export async function syncedAt(
  storage: CacheStorage | undefined,
  url: string,
): Promise<number | null> {
  if (!storage) return null;
  const kept = await storage.match(url).catch(() => undefined);
  if (!kept) return null;
  const atMs = Number(await kept.text());
  return Number.isFinite(atMs) && atMs > 0 ? atMs : null;
}

/** «31 October 2026» in the visitor's language and time zone. */
export function syncDate(tag: string, atMs: number): string {
  const options = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  return new Intl.DateTimeFormat(tag, options).format(atMs);
}

export interface DismissalChange {
  /** Whether the row was hidden with its ✕. */
  readonly dismissed: boolean;
  readonly wasOnline: boolean;
  readonly online: boolean;
}

/**
 * Whether the offline row stays hidden after the connection changes: a ✕
 * holds until the app goes offline again (VENT-57, V-08).
 */
export function dismissalAfter(change: DismissalChange): boolean {
  const wentOffline = change.wasOnline && !change.online;
  return wentOffline ? false : change.dismissed;
}
