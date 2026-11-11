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
 * The descent films the loader plays (VENT-117, VENT-61 variant C): one
 * per curated site south of 80° S, rendered by RAEA (ASSETS.md), 6 s from
 * orbit to the eye 2 m over the point, ending on the view's opening look.
 * Two cuts, wide (1280 x 720) and phone (720 x 1280), each in AV1 then
 * H.264, and the first frame as a still painted before the film comes.
 * Served from `public/site-films/`, never precached. Pure.
 */

/** The sites that have a film, by their id in the site list. */
export const FILM_SITES: ReadonlySet<string> = new Set([
  'im2-athena', 'bluemoon-mk1-pathfinder', 'griffin1-nobile',
  'artemis-malapert-massif', 'im1-odysseus', 'artemis-mons-mouton-plateau',
  'artemis-haworth', 'change7-target', 'artemis-de-gerlache-rim-2',
  'artemis-slater-plain', 'artemis-peak-near-cabeus-b',
]);

export type FilmCut = 'wide' | 'phone';

/** One `<source>`, in the order the browser should try them. */
export interface FilmSource {
  readonly src: string;
  readonly type: string;
}

export interface Film {
  readonly sources: readonly FilmSource[];
  /** The film's first frame, painted until it plays. */
  readonly poster: string;
}

/** AV1 Main, level 3.1, 8 bits: what the encode makes (ASSETS.md). */
const AV1 = 'video/mp4; codecs="av01.0.05M.08"';
const H264 = 'video/mp4';
const FOLDER = 'site-films';

/** `site`'s film in `cut`, under `base` (the site's base path, with `/`). */
export function siteFilm(base: string, site: string, cut: FilmCut): Film {
  const stem = `${base}${FOLDER}/${site}-${cut}`;
  return {
    sources: [
      { src: `${stem}.av1.mp4`, type: AV1 },
      { src: `${stem}.h264.mp4`, type: H264 },
    ],
    poster: `${stem}-start.webp`,
  };
}
