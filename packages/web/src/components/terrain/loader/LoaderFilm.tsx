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
 * The loader's descent film (VENT-117, VENT-61 variant C): the site's
 * descent from orbit to the eye 2 m over the point, filling the band the
 * scene frames, its first frame painted until it plays; its last frame,
 * the view's opening look, held until the scene has drawn. Decoration for
 * a screen reader: the loader's status says what happens.
 */
import { useEffect, useRef } from 'react';
import type { FilmEvent } from '../../../terrain/loader/film-gate';
import type { Film } from '../../../terrain/loader/site-films';
import { playFilm } from './film-element';

interface Props {
  readonly film: Film;
  readonly tell: (event: FilmEvent) => void;
}

export function LoaderFilm({ film, tell }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    return video ? playFilm(video, film.sources, tell) : undefined;
  }, [film, tell]);
  return (
    <video ref={ref} className="loader-film" poster={film.poster} muted playsInline preload="auto" disablePictureInPicture aria-hidden="true" tabIndex={-1} />
  );
}
