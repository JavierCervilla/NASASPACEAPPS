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
 * A chunk loaded on demand that is gone (VENT-52). An old page after a
 * deploy asks for a file of its own build, which the server no longer
 * holds (and the new worker's cache never did): the import rejects. That
 * is a new version, not a bug, so the page is told (MISSING_CHUNK_EVENT)
 * and «New version ready» offers the reload.
 *
 * Only the import's own rejection goes through `loadChunk`, and of those
 * only the browser's failure to fetch the module counts: an error the
 * module throws as it evaluates rejects the same promise with its own
 * error, and anything thrown while the view renders or mounts never
 * passes here.
 */

export const MISSING_CHUNK_EVENT = 'ventana:missing-chunk';

/**
 * How each engine words a module it could not fetch (Chromium, Firefox,
 * Safari), and Vite's own preload helper for a chunk's stylesheet.
 */
const FETCH_FAILED = [
  /^Failed to fetch dynamically imported module/,
  /^error loading dynamically imported module/,
  /^Importing a module script failed/,
  /^Unable to preload CSS for /,
];

/**
 * The import rejected because the chunk could not be fetched: `offline`
 * when the browser had no network then, so it is no new version.
 */
export class MissingChunkError extends Error {
  constructor(cause: unknown, readonly offline = false) {
    super(`chunk missing: ${String(cause)}`, { cause });
    this.name = 'MissingChunkError';
  }
}

/** Whether the browser says it is online (no navigator: assume it is). */
const browserOnline = (): boolean =>
  globalThis.navigator?.onLine !== false;

/** Whether `error` is the browser's failure to fetch a module. */
export function isMissingChunk(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return FETCH_FAILED.some((pattern) => pattern.test(error.message));
}

/**
 * Runs the dynamic import `load`; a missing chunk tells `target` and
 * rejects with a MissingChunkError, any other error passes untouched.
 * Offline the same failure is the network's (an on-demand chunk is not
 * kept for offline use): it rejects marked `offline` and tells nobody, so
 * no «New version ready» shows for a version that is not new. A browser
 * that knows it is offline is not asked at all: it keeps a module it
 * failed to fetch failed for the page's life, so a try once back online
 * would fail without a request (VENT-59).
 */
export async function loadChunk<T>(
  load: () => Promise<T>,
  target: EventTarget,
  online: () => boolean = browserOnline,
): Promise<T> {
  if (!online()) throw new MissingChunkError('offline', true);
  try {
    return await load();
  } catch (error) {
    if (!isMissingChunk(error)) throw error;
    if (!online()) throw new MissingChunkError(error, true);
    target.dispatchEvent(new Event(MISSING_CHUNK_EVENT));
    throw new MissingChunkError(error);
  }
}

/** Calls `listener` on each missing chunk; returns the stop. */
export function onMissingChunk(
  target: EventTarget,
  listener: () => void,
): () => void {
  target.addEventListener(MISSING_CHUNK_EVENT, listener);
  return () => target.removeEventListener(MISSING_CHUNK_EVENT, listener);
}
