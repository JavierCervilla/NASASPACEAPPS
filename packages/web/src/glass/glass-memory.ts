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
 * The session's memory of a failed frame probe: once Liquid was too slow
 * on this device, the page stays frosted until the tab closes, with no
 * second trial. Storage can be missing or refuse access (private modes,
 * blocked cookies): then nothing is kept and nothing breaks.
 */
import type { GlassMode } from './glass-gate';

/** The part of `Storage` the memory uses. */
export type GlassStorage = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'ventana.glass';

/** The session's storage, or null when the browser refuses it. */
export function glassStore(): GlassStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** The mode kept for this session, or null. */
export function keptGlass(storage: GlassStorage | null): GlassMode | null {
  try {
    return storage?.getItem(KEY) === 'frosted' ? 'frosted' : null;
  } catch {
    return null;
  }
}

/** Keeps frosted for the rest of the session. */
export function keepFrosted(storage: GlassStorage | null): void {
  try {
    storage?.setItem(KEY, 'frosted');
  } catch {
    // Full or refused storage: the next load probes again.
  }
}
