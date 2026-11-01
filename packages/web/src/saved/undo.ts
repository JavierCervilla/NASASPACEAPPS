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
 * The undo of deleted saved sites (VENT-37): a delete asks no question;
 * instead it is offered back for {@link UNDO_MS} («Deleted Cabeus ridge ·
 * Undo»). A delete while one is on offer joins it («Deleted 2 sites ·
 * Undo») and the time starts again: Undo puts every one back where it
 * stood, so none is lost silently. While the offer is held (the focus or
 * the pointer on it) the time stops, and it starts again when let go, so
 * there is always time to reach it. A delete made from the keyboard says
 * so, and the offer takes the focus (UndoToast.tsx).
 */
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import type { Removed, SavedSites } from './saved-sites';

/** How long a delete can be undone. */
export const UNDO_MS = 5000;

/** The deletes on offer. */
export interface UndoOffer {
  /** In the order they were made. */
  readonly removed: readonly Removed[];
  /** The last one came from the keyboard: the offer takes the focus. */
  readonly fromKeyboard: boolean;
}

export interface Undo {
  /** The deletes on offer, if any. */
  readonly current: WatchedValue<UndoOffer | null>;
  /** Offers `removed` back for a while, with any still on offer. */
  offer(removed: Removed, fromKeyboard?: boolean): void;
  /** Puts the offered sites back; false when none was put back. */
  undo(): boolean;
  /** Withdraws the offer. */
  dismiss(): void;
  /** Stops the time while the offer is in use; `release` restarts it. */
  hold(): void;
  release(): void;
}

/**
 * Puts `removed` back, the last delete first: each index is where its site
 * stood before the deletes after it. True when any came back.
 */
function restoreAll(
  saved: Pick<SavedSites, 'restore'>,
  removed: readonly Removed[],
): boolean {
  const back = [...removed].reverse().map((one) => saved.restore(one));
  return back.some(Boolean);
}

/** `offer` with `removed` joined, the last delete's `fromKeyboard` kept. */
const joined = (
  offer: UndoOffer | null,
  removed: Removed,
  fromKeyboard: boolean,
): UndoOffer => ({
  removed: [...(offer?.removed ?? []), removed],
  fromKeyboard,
});

/** `after` calls a function once after a delay and returns its cancel. */
export function createUndo(
  saved: Pick<SavedSites, 'restore'>,
  after: (fn: () => void, ms: number) => () => void,
): Undo {
  const current = createWatchedValue<UndoOffer | null>(null);
  let cancel = (): void => undefined;
  const dismiss = (): void => {
    cancel();
    current.set(null);
  };
  const release = (): void => {
    cancel();
    if (current.get()) cancel = after(() => current.set(null), UNDO_MS);
  };
  const offer = (removed: Removed, fromKeyboard = false): void => {
    current.set(joined(current.get(), removed, fromKeyboard));
    release();
  };
  const undo = (): boolean => {
    const removed = current.get()?.removed ?? [];
    dismiss();
    return restoreAll(saved, removed);
  };
  return { current, offer, undo, dismiss, hold: () => cancel(), release };
}
