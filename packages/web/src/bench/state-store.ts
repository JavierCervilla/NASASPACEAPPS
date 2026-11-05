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
 * Writing and clearing the benchmark's kept state (run-state.ts); a
 * storage that refuses (private mode, quota) keeps nothing, said by the
 * return value.
 */
import { STATE_KEY, type StateStorage } from './run-state';
import type { BenchState } from './types';

/** Keeps `state`; false when the storage refused it. */
export function writeState(
  storage: StateStorage | null,
  state: BenchState,
): boolean {
  try {
    storage?.setItem(STATE_KEY, JSON.stringify(state));
    return storage !== null;
  } catch {
    return false;
  }
}

/** Forgets the kept state. */
export function clearState(storage: StateStorage | null): void {
  try {
    storage?.removeItem(STATE_KEY);
  } catch {
    // Nothing kept to forget.
  }
}

/** The page's session storage, or null where it is refused. */
export function sessionStore(): StateStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
