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
 * When the loader's film lets the scene through (VENT-117): the film plays
 * to its end even when the scene has drawn first, and holds its last frame
 * when it ends first, until the scene draws; then the hand-over. A film
 * that fails lets go at once (the loader falls back to its usual picture),
 * and one still playing long after the scene has drawn (a stalled network)
 * is given up. Pure.
 */

export type FilmState = 'playing' | 'ended' | 'failed';

export type FilmEvent = 'ended' | 'failed' | 'giveUp';

/** How long a drawn scene waits for a film that has not ended, ms. */
export const FILM_GIVE_UP_MS = 8000;

/** The film's state after `event`; an ended or failed film stays so. */
export function filmStep(state: FilmState, event: FilmEvent): FilmState {
  if (state !== 'playing') return state;
  return event === 'failed' ? 'failed' : 'ended';
}

/**
 * Whether the loader may hand over to a scene that has `drawn`: with no
 * film (null), at once; with one, once it no longer plays.
 */
export function handsOver(drawn: boolean, film: FilmState | null): boolean {
  return drawn && film !== 'playing';
}

/** Whether the film still shows (a failed one gives way to the picture). */
export const filmShows = (film: FilmState | null): boolean =>
  film !== null && film !== 'failed';
