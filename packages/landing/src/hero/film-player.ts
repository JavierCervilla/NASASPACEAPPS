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

import { filmSources, type FilmCut, type FilmSource } from './film-plan';

/** What the player needs of a `<video>`; tests hand in fakes. */
export interface FilmVideo {
  /** Puts the sources in and starts loading them. */
  load(sources: readonly FilmSource[]): void;
  play(): Promise<void>;
  pause(): void;
  on(event: 'playing' | 'ended', listener: () => void): void;
}

/**
 * Which layer the hero shows: the start frame, the descent, the hold, or
 * the still when the film will not play.
 */
export type FilmPhase = 'start' | 'still' | 'descent' | 'hold';

export interface FilmParts {
  readonly descent: FilmVideo;
  readonly hold: FilmVideo;
  /** Shows a layer; the one under it stays painted until then. */
  readonly show: (phase: FilmPhase) => void;
}

export interface FilmPlayer {
  /** On screen and the page shown: play; otherwise pause. */
  setShown(shown: boolean): void;
}

/**
 * Plays the descent once, then the hold on a loop. The hold is loaded
 * with the descent and only shown once it plays, so the descent's last
 * frame, which is the hold's first, stays on screen across the swap.
 * Nothing plays until the first setShown(true). A play() the browser
 * refuses while shown leaves the still for good.
 */
export function filmPlayer(parts: FilmParts, cut: FilmCut): FilmPlayer {
  let current: 'descent' | 'hold' = 'descent';
  let shown = false;
  let failed = false;
  const run = () => {
    if (failed || !shown) return;
    parts[current].play().catch(() => {
      if (!shown) return;
      failed = true;
      parts.show('still');
    });
  };
  wire(parts, cut, () => {
    current = 'hold';
    run();
  });
  return {
    setShown(next) {
      shown = next;
      if (next) run();
      else parts[current].pause();
    },
  };
}

/** Each video shows itself once it plays; the hold loads with the descent. */
function wire(parts: FilmParts, cut: FilmCut, onDescentEnd: () => void) {
  parts.descent.on('playing', () => parts.show('descent'));
  parts.hold.on('playing', () => parts.show('hold'));
  parts.descent.on('ended', onDescentEnd);
  parts.descent.load(filmSources(cut, 'descent'));
  parts.hold.load(filmSources(cut, 'hold'));
}
