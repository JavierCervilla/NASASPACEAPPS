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
 * Where a ring run tells how its tiles come (VENT-60): one value at a
 * time (ring-progress.ts), and who wants to hear of a change, in the shape
 * `useSyncExternalStore` reads.
 */
import { NOT_LISTED, type RingProgress } from './ring-progress';

export interface ProgressStore {
  /** The same value until it changes. */
  readonly get: () => RingProgress;
  /** Replaces the value with `change` of it and tells the listeners. */
  readonly update: (change: (was: RingProgress) => RingProgress) => void;
  /** Hears each change; returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** A store that starts before the list. */
export function createProgressStore(): ProgressStore {
  let value = NOT_LISTED;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    update: (change) => {
      const next = change(value);
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
