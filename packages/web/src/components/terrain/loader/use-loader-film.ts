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
 * The loader's descent film (VENT-117): chosen once per site and tier by
 * the loader's one chooser (loader-picture.ts), its cut by the layout (the
 * phone's under the phone breakpoint, as the scene's field of view is),
 * and its state (film-gate.ts): playing, ended or failed, told by the
 * video, or given up when a drawn scene has waited too long for it. A new
 * site or cut starts a new film.
 */
import {
  useCallback, useEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { benchAsked } from '../../../lib/bench-param';
import type { Tier } from '../../../lib/quality';
import { isPhoneViewport, prefersSaveData } from '../../../lib/viewport';
import {
  FILM_GIVE_UP_MS, filmStep, type FilmEvent, type FilmState,
} from '../../../terrain/loader/film-gate';
import { loaderPicture } from '../../../terrain/loader/loader-picture';
import { siteFilm, type Film } from '../../../terrain/loader/site-films';
import type { ViewTier } from '../../../terrain/view-tier';
import { baseUrl } from '../ring-fine';

export interface LoaderFilm {
  readonly film: Film;
  readonly state: FilmState;
  /** What the video says happened. */
  readonly tell: (event: FilmEvent) => void;
}

const reducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `site`'s film at `tier`, or null when the loader shows no film. */
function useFilmOf(site: string, tier: Tier): Film | null {
  return useMemo(() => {
    const picture = loaderPicture({ tier, site,
      reducedMotion: reducedMotion(), saveData: prefersSaveData(),
      bench: benchAsked(window.location.search) });
    if (picture !== 'film') return null;
    return siteFilm(baseUrl(), site, isPhoneViewport() ? 'phone' : 'wide');
  }, [site, tier]);
}

/** Gives the film up once a drawn scene has waited long enough. */
function useGiveUp(waiting: boolean, tell: (event: FilmEvent) => void) {
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setTimeout(() => tell('giveUp'), FILM_GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [waiting, tell]);
}

/** The film for `site`, or null; `drawn`: the scene's first frame. */
export function useLoaderFilm(site: string, view: ViewTier, drawn: boolean):
  LoaderFilm | null {
  const { tier } = useSyncExternalStore(view.subscribe, view.get, view.get);
  const film = useFilmOf(site, tier);
  const key = film?.poster ?? null;
  const [kept, setKept] = useState({ key, state: 'playing' as FilmState });
  const state = kept.key === key ? kept.state : 'playing';
  const tell = useCallback((event: FilmEvent) => setKept((was) => ({ key,
    state: filmStep(was.key === key ? was.state : 'playing', event) })),
  [key]);
  useGiveUp(film !== null && drawn && state === 'playing', tell);
  return film ? { film, state, tell } : null;
}
