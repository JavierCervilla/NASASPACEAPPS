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
 * The marks the page keeps of its WebGL in `localStorage` (VENT-69): the
 * time a context was last made and the time one was last lost. What they
 * mean is in gl-memory.ts. Storage that is missing or refused remembers
 * nothing.
 */

/** The part of `Storage` the marks use. */
export type GlStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const GL_WORKED_KEY = 'ventana.glWorked';
export const GL_LOST_KEY = 'ventana.glLostAt';

/** The persistent storage, or null when the browser refuses it. */
export function glStorage(): GlStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Writes the time `nowMs` under `key`. */
export function markGl(
  storage: GlStorage | null,
  key: typeof GL_WORKED_KEY | typeof GL_LOST_KEY,
  nowMs: number,
): void {
  try {
    storage?.setItem(key, String(nowMs));
  } catch {
    // Full or refused storage: the next failure reads as an absence.
  }
}

/** Whether a context was ever made or lost here. */
export function hadGl(storage: GlStorage | null): boolean {
  try {
    return storage?.getItem(GL_WORKED_KEY) != null
      || storage?.getItem(GL_LOST_KEY) != null;
  } catch {
    return false;
  }
}
