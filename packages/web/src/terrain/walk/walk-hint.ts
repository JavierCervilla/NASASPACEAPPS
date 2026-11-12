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
 * The walk's first-time hint (VENT-121), «Tap the ground to go there»: kept
 * as seen after the first move or its ✕, in `localStorage` like the pin's
 * hint (pin/first-hint.ts). Storage that is missing or refuses access only
 * brings it back next visit.
 */
import type { HintStorage } from '../../pin/first-hint';

/** Where the hint's dismissal is kept. */
export const WALK_HINT_KEY = 'ventana.walkHint';
const SEEN = 'seen';

/** Whether the hint was seen on this device. */
export function walkHintSeen(storage: HintStorage | null): boolean {
  try {
    return storage?.getItem(WALK_HINT_KEY) === SEEN;
  } catch {
    return false;
  }
}

/** Keeps the hint seen, if the browser lets it. */
export function keepWalkHintSeen(storage: HintStorage | null): void {
  try {
    storage?.setItem(WALK_HINT_KEY, SEEN);
  } catch {
    // Refused storage: the hint is gone for this visit only.
  }
}
