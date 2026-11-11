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
 * The one choice of the loader's picture: the plan of the near tiles, then
 * the skyline (VENT-60, B→A, the human's verdict), or the site's descent
 * film (VENT-117, VENT-61 variant C) for a curated site that has one, on a
 * tier that can afford it (high or medium), unless the person asked for
 * less motion or to save data, or a benchmark runs (`?bench`: its runs
 * measure the view as before, with no 6 s film or video decode). A
 * picture for one case plugs in here.
 */
import type { Tier } from '../../lib/quality';
import { FILM_SITES } from './site-films';

export type LoaderPicture = 'tilesThenSkyline' | 'film';

/** What the choice reads, all known before anything is asked. */
export interface PictureFacts {
  readonly tier: Tier;
  /** The selected site's id; a custom or saved point's starts with `@`. */
  readonly site: string;
  readonly reducedMotion: boolean;
  readonly saveData: boolean;
  /** `?bench` (any suite) is in the address. */
  readonly bench: boolean;
}

const FILM_TIERS: ReadonlySet<Tier> = new Set(['high', 'medium']);

/** The loader's picture for `facts`. */
export function loaderPicture(facts: PictureFacts): LoaderPicture {
  const film = FILM_SITES.has(facts.site) && FILM_TIERS.has(facts.tier)
    && !facts.reducedMotion && !facts.saveData && !facts.bench;
  return film ? 'film' : 'tilesThenSkyline';
}
