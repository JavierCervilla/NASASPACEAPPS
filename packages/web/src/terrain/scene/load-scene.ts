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
 * The on-foot scene's chunk, loaded on demand (VENT-34): through
 * `loadOnDemandChunk`, so a chunk gone after a deploy tells the page
 * (VENT-52) and the view says so instead of «cannot start on this device».
 */
import { isGlBlocked } from '../../lib/gl-memory';
import { MissingChunkError } from '../../pwa/missing-chunk';
import { loadOnDemandChunk } from '../../pwa/on-demand-chunk';

/** Imports the scene's module; `target` hears of a missing chunk. */
export const loadTerrainScene = (target: EventTarget) =>
  loadOnDemandChunk(() => import('./terrain-scene'), target);

/**
 * Why the scene did not start: its chunk is gone, it could not be fetched
 * offline, the browser blocked WebGL after a graphics fault (VENT-69), or
 * the scene failed.
 */
export function sceneFailure(
  error: unknown,
): 'missing' | 'offline' | 'blocked' | 'failed' {
  if (isGlBlocked(error)) return 'blocked';
  if (!(error instanceof MissingChunkError)) return 'failed';
  return error.offline ? 'offline' : 'missing';
}
