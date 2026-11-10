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
 * The site films' sites (VENT-115), in the order they are made: each one's
 * id in the app (packages/server/data/sites.json, its folder here) and its
 * key in moon-scene's sites.mjs (im2-athena is the hero film's `im2`, the
 * same point, so the two share their caches). The instant is the same for
 * every site.
 *
 *   node packages/landing/media-src/site-films/scripts/sites.mjs [SITE_ID]   (prints the moon-scene key, or the list)
 */
export const INSTANT = '2026-12-15T05:00:00Z';

export const FILM_SITES = [
  ['im2-athena', 'im2'],
  ['artemis-malapert-massif', 'artemis-malapert-massif'],
  ['bluemoon-mk1-pathfinder', 'bluemoon-mk1-pathfinder'],
  ['artemis-haworth', 'artemis-haworth'],
  ['im1-odysseus', 'im1-odysseus'],
  ['change7-target', 'change7-target'],
  ['griffin1-nobile', 'griffin1-nobile'],
  ['artemis-peak-near-cabeus-b', 'artemis-peak-near-cabeus-b'],
  ['artemis-mons-mouton-plateau', 'artemis-mons-mouton-plateau'],
  ['artemis-de-gerlache-rim-2', 'artemis-de-gerlache-rim-2'],
  ['artemis-slater-plain', 'artemis-slater-plain'],
];

/** The moon-scene key of a film's site id. */
export function sceneKeyOf(siteId) {
  const row = FILM_SITES.find(([id]) => id === siteId);
  if (!row) throw new Error(`unknown site ${siteId}; known: ${FILM_SITES.map(([id]) => id).join(', ')}`);
  return row[1];
}

/** The tag build.mjs puts in its file names for an instant. */
export const tagOf = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/00Z$/, 'Z');

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2];
  process.stdout.write(id ? `${sceneKeyOf(id)}\n` : `${FILM_SITES.map(([s]) => s).join('\n')}\n`);
}
