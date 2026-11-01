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
 * The first-time hint (VENT-37): one line that says how to drop a pin,
 * shown until the first pin is dropped or the hint is dismissed, and then
 * never again on this device. Storage can be missing or refuse access
 * (private modes): then the hint comes back next visit, and nothing
 * breaks.
 */
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import type { Carrier } from './carrier';

/** The part of `Storage` the hint uses. */
export type HintStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Where the hint's dismissal is kept. */
export const HINT_KEY = 'ventana.pinHint';
const SEEN = 'seen';

export interface PinHint {
  /** Whether the hint shows. */
  readonly shown: WatchedValue<boolean>;
  /** Hides it for good. */
  dismiss(): void;
}

/** Whether the hint was seen on this device. */
function wasSeen(storage: HintStorage | null): boolean {
  try {
    return storage?.getItem(HINT_KEY) === SEEN;
  } catch {
    return false;
  }
}

/** Keeps the dismissal, if the browser lets it. */
function keepSeen(storage: HintStorage | null): void {
  try {
    storage?.setItem(HINT_KEY, SEEN);
  } catch {
    // Refused storage: the hint is gone for this visit only.
  }
}

/** The hint, gone once `carrier` drops a pin or it is dismissed. */
export function createPinHint(
  storage: HintStorage | null,
  carrier: Pick<Carrier, 'ended'>,
): PinHint & { readonly stop: () => void } {
  const shown = createWatchedValue(!wasSeen(storage));
  const dismiss = (): void => {
    keepSeen(storage);
    shown.set(false);
  };
  const stop = carrier.ended.subscribe(() => {
    if (carrier.ended.get()?.kind === 'dropped') dismiss();
  });
  return { shown, dismiss, stop };
}
