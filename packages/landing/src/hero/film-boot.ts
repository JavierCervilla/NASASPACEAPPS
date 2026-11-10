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

import { videoOf } from './film-dom';
import { watchShown } from './shown-watch';
import { PHONE_QUERY, filmCut, type FilmEnv } from './film-plan';
import { filmPlayer, type FilmPhase } from './film-player';
import { showStill } from './film-still';

/** The parts of a window the film reads before it asks for anything. */
export interface FilmWindow {
  matchMedia(query: string): { readonly matches: boolean };
  /** Save-Data lives in `navigator.connection`, which not every engine has. */
  readonly navigator: object;
}

interface SaveDataNavigator {
  readonly connection?: { readonly saveData?: boolean };
}

/** Reduced motion, Save-Data and the phone layout, read once. */
export function filmEnv(win: FilmWindow): FilmEnv {
  return {
    reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)')
      .matches,
    saveData:
      (win.navigator as SaveDataNavigator).connection?.saveData === true,
    phone: win.matchMedia(PHONE_QUERY).matches,
  };
}

/**
 * Starts the hero film (VENT-112) over its start frame, or shows the still
 * under reduced motion or Save-Data, when no video is requested; a play()
 * the browser refuses shows the still too.
 */
export function bootFilm(doc: Document, win: FilmWindow): void {
  const stage = doc.querySelector<HTMLElement>('[data-film]');
  if (!stage) return;
  const cut = filmCut(filmEnv(win));
  const videos = filmVideos(stage);
  if (!cut || !videos) {
    show(stage, 'still');
    return;
  }
  const player = filmPlayer(
    { ...videos, show: (phase) => show(stage, phase) },
    cut,
  );
  watchShown(stage, (shown) => player.setShown(shown));
}

function filmVideos(stage: HTMLElement) {
  const part = (name: string) =>
    stage.querySelector<HTMLVideoElement>(`[data-film-part="${name}"]`);
  const descent = part('descent');
  const hold = part('hold');
  return descent && hold
    ? { descent: videoOf(descent), hold: videoOf(hold) }
    : null;
}

function show(stage: HTMLElement, phase: FilmPhase): void {
  stage.dataset.film = phase;
  if (phase === 'still') showStill(stage);
}
