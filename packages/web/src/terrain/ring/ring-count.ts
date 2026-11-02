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

/** Counting the wanted tiles of each level (VENT-46). */
import type { RingEntry } from './ring-answer';
import type { RingFeed } from './ring-source';

/** How many wanted tiles each level has. */
export function countByLevel(
  wanted: readonly RingEntry[],
): Map<number, number> {
  const left = new Map<number, number>();
  for (const e of wanted) left.set(e.level, (left.get(e.level) ?? 0) + 1);
  return left;
}

/** Settles at once the levels that want no tile. */
export function settleEmpty(
  left: ReadonlyMap<number, number>,
  levels: number,
  feed: RingFeed,
): void {
  for (let level = 0; level < levels; level++) {
    if (!left.has(level)) feed.settled(level);
  }
}
