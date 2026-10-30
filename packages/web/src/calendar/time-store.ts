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
 * The selected instant, shared by the globe, the phone widgets and the
 * calendar. Live by default: the instant is the clock's, and follows it
 * (follow-clock.ts). Setting an instant leaves live mode (scrubbing);
 * `now()` returns to it. Passed to whoever needs it: no module state.
 */

export interface TimeState {
  /** The selected instant, Unix ms. */
  readonly atMs: number;
  /** Whether the instant follows the clock. */
  readonly live: boolean;
}

export interface TimeStore {
  get(): TimeState;
  /** Selects `atMs` and leaves live mode. */
  set(atMs: number): void;
  /** Back to live mode, at the clock's instant. */
  now(): void;
  /** Calls `listener` after every change; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** A store that starts live on `clock` (Unix ms). */
export function createTimeStore(clock: () => number): TimeStore {
  let current: TimeState = { atMs: clock(), live: true };
  const listeners = new Set<() => void>();
  const change = (next: TimeState): void => {
    if (next.atMs === current.atMs && next.live === current.live) return;
    current = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    get: () => current,
    set: (atMs) => change({ atMs, live: false }),
    now: () => change({ atMs: clock(), live: true }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
