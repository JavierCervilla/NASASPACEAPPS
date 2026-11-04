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
 * The on-foot view's open mark in `localStorage` (VENT-69): a browser that
 * blocks WebGL after a GPU reset needs a restart, which empties the
 * session's storage and with it view-tier-memory's mark, so the page that
 * died is forgotten. This one holds the time it was set and counts for
 * {@link OPEN_TTL_MS}.
 */
import { OPEN_KEY, type TierStorage } from './view-tier-memory';

/** How long a mark left in `localStorage` says the page died: 24 hours. */
export const OPEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Marks the view open since `nowMs` in `localStorage`, or closed. */
export function keepOpenSince(
  local: TierStorage | null,
  open: boolean,
  nowMs: number,
): void {
  try {
    local?.setItem(OPEN_KEY, open ? String(nowMs) : '');
  } catch {
    // Refused storage: only the session's mark tells the next page.
  }
}

/**
 * Whether `localStorage` holds a mark set less than {@link OPEN_TTL_MS}
 * before `nowMs`; a value that is no time, or an empty one, is none.
 */
export function wasOpenWithin(
  local: TierStorage | null,
  nowMs: number,
): boolean {
  try {
    const since = Number(local?.getItem(OPEN_KEY));
    return Number.isFinite(since) && since > 0 && nowMs - since < OPEN_TTL_MS;
  } catch {
    return false;
  }
}
