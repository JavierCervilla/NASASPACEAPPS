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
 * When a new scene input is worth a frame (VENT-49). A new instant makes a
 * new sky, a new bodies list and a new words object every minute, none of
 * which change what is drawn; so the view compares what it draws, by value
 * where an object is new each time, and draws only for a change. The sky
 * itself is the relight's business (relight.ts), not this. Pure.
 */
import { RELIGHT_DEG } from './relight';
import type { SceneInput, SceneWords } from './scene/scene-types';

/** Whether two sets of labels read the same, the ridge's within the move. */
function sameWords(a: SceneWords, b: SceneWords): boolean {
  const same = a.rings.length === b.rings.length &&
    a.rings.every((text, i) => text === b.rings[i]);
  if (!same || !a.ridge || !b.ridge) return same && a.ridge === b.ridge;
  return a.ridge.text === b.ridge.text &&
    Math.abs(a.ridge.azDeg - b.ridge.azDeg) < RELIGHT_DEG;
}

/** Whether the tiles of `a` and `b` are the same ones. */
const sameTiles = (a: SceneInput, b: SceneInput): boolean =>
  a.tiles.length === b.tiles.length &&
  a.tiles.every((tile, i) => tile === b.tiles[i]);

/** Whether `next` changes what the view draws, bar the sky. */
export function drawsAgain(was: SceneInput | null, next: SceneInput): boolean {
  if (!was) return true;
  return !sameTiles(was, next) || was.ring !== next.ring ||
    was.profile !== next.profile || was.seed !== next.seed ||
    !sameWords(was.words, next.words);
}
