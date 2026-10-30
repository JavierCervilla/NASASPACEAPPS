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
 * The orbital thumbnail of a site, from the manifest that
 * packages/web/scripts/site_thumbs.py writes next to this file: a site in
 * it has a LOLA relief image under public/thumbs; any other (north of
 * 80° S, or one the API added since the build) has none.
 */
import manifest from './thumbs.json';

/** One manifest entry: the file under public/thumbs and its frame. */
export interface ThumbEntry {
  readonly file: string;
  /** Width of ground the image shows, in km. */
  readonly frameKm: number;
}

/** A site's image, ready for an `<img>`. */
export interface Thumb {
  readonly src: string;
  readonly alt: string;
  /** «LOLA · 30 km». */
  readonly caption: string;
}

const ENTRIES: Readonly<Record<string, ThumbEntry>> = manifest;

/**
 * The image of site `id` at `place`, under the site's base path `base`;
 * null when the site has none. `entries` defaults to the manifest.
 */
export function thumbOf(
  id: string,
  place: string,
  base: string,
  entries: Readonly<Record<string, ThumbEntry>> = ENTRIES,
): Thumb | null {
  const entry = Object.hasOwn(entries, id) ? entries[id] : undefined;
  if (!entry) return null;
  return {
    src: `${base.replace(/\/?$/, '/')}thumbs/${entry.file}`,
    alt: `${place} from orbit, LOLA relief`,
    caption: `LOLA · ${entry.frameKm} km`,
  };
}
