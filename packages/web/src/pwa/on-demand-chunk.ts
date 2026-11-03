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
 * A chunk left out of the precache (the on-foot view's, VENT-34): offline
 * it cannot load, and a failed try would stay failed for the page's life.
 */
import { browserOnline, loadChunk, MissingChunkError } from './missing-chunk';

/**
 * `loadChunk` for a chunk left out of the precache: a browser that knows
 * it is offline is not asked at all, since it keeps a module it failed to
 * fetch failed for the page's life, so a try once back online would fail
 * without a request (VENT-59).
 */
export async function loadOnDemandChunk<T>(
  load: () => Promise<T>,
  target: EventTarget,
  online: () => boolean = browserOnline,
): Promise<T> {
  if (!online()) throw new MissingChunkError('offline', true);
  return loadChunk(load, target, online);
}
