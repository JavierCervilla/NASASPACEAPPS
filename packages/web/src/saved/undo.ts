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
 * The undo of a deleted saved site (VENT-37): a delete asks no question;
 * instead the last one is offered back for {@link UNDO_MS} («Deleted
 * Cabeus ridge · Undo»), and a new delete replaces the offer. While the
 * offer is held (the focus or the pointer on it) the time stops, and it
 * starts again when let go, so there is always time to reach it.
 */
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import type { Removed, SavedSites } from './saved-sites';

/** How long a delete can be undone. */
export const UNDO_MS = 5000;

export interface Undo {
  /** The delete on offer, if any. */
  readonly current: WatchedValue<Removed | null>;
  /** Offers `removed` back for a while. */
  offer(removed: Removed): void;
  /** Puts the offered site back; false when there was none to put. */
  undo(): boolean;
  /** Withdraws the offer. */
  dismiss(): void;
  /** Stops the time while the offer is in use; `release` restarts it. */
  hold(): void;
  release(): void;
}

/** `after` calls a function once after a delay and returns its cancel. */
export function createUndo(
  saved: Pick<SavedSites, 'restore'>,
  after: (fn: () => void, ms: number) => () => void,
): Undo {
  const current = createWatchedValue<Removed | null>(null);
  let cancel = (): void => undefined;
  const dismiss = (): void => {
    cancel();
    current.set(null);
  };
  const release = (): void => {
    cancel();
    if (current.get()) cancel = after(() => current.set(null), UNDO_MS);
  };
  const offer = (removed: Removed): void => {
    current.set(removed);
    release();
  };
  const undo = (): boolean => {
    const removed = current.get();
    dismiss();
    return removed ? saved.restore(removed) : false;
  };
  return { current, offer, undo, dismiss, hold: () => cancel(), release };
}
