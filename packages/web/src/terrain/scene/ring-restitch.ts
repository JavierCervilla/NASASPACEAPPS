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
 * When a parent tile arrives (VENT-46) the finer tiles under it were placed
 * without it: those with nodes in the blend band of their window's edge
 * place them again, stitched to it (ring-stitch.ts). Fine tiles arrive
 * first, so this is the usual case.
 */
import type { RingTile } from '../ring/ring-store';
import { inBand } from '../ring/ring-stitch';
import type { LayerState } from './ring-entry';

/** Marks the children of `tile` its arrival changes; their names, levels. */
export function restitched(s: LayerState, tile: RingTile): [string, number][] {
  const { level, x, y } = tile.key;
  const out: [string, number][] = [];
  for (const [name, entry] of s.entries) {
    const key = entry.tile.key;
    const child = key.level === level - 1 && Math.floor(key.x / 4) === x &&
      Math.floor(key.y / 4) === y;
    if (!child || !inBand(key, s.view.windows[key.level])) continue;
    entry.restitch = true;
    out.push([name, key.level]);
  }
  return out;
}
