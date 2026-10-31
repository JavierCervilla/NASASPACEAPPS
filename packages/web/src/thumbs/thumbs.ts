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
 * it has a LOLA relief image under public/thumbs, at 320 px and at 640 px
 * for 2x screens; any other (north of 80° S, or one the API added since
 * the build) has none.
 */
import manifest from './thumbs.json';

/** One manifest entry: its files under public/thumbs and its frame. */
export interface ThumbEntry {
  /** 320 x 320. */
  readonly file: string;
  /** 640 x 640, the same frame. */
  readonly file2x: string;
  /** Width of ground the image shows, in km. */
  readonly frameKm: number;
}

/** A site's image, ready for an `<img>`. */
export interface Thumb {
  readonly src: string;
  /** Both widths, so a 2x screen fetches only the 640 px file. */
  readonly srcset: string;
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
  const dir = `${base.replace(/\/?$/, '/')}thumbs/`;
  return {
    src: `${dir}${entry.file}`,
    srcset: `${dir}${entry.file} 320w, ${dir}${entry.file2x} 640w`,
    alt: `${place} from orbit, LOLA relief`,
    caption: `LOLA · ${entry.frameKm} km`,
  };
}
