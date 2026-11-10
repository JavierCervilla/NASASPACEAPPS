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
 * Copies the maps the app already ships (ASSETS.md credits each one) into
 * media/textures/, where the hero film's shaders read them: a raea render
 * reads its media folder only. Nothing is downloaded.
 *
 *   node packages/landing/media-src/hero-film/scripts/textures.mjs
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WEB = new URL('../../../../web/', import.meta.url);
const OUT = fileURLToPath(new URL('../media/textures/', import.meta.url));
const FILES = [
  'public/textures/moon-lroc-4k.jpg',
  'public/textures/moon-lola-normal-4k.jpg',
  'src/terrain/maps/on-foot-earth.webp',
  'src/terrain/maps/on-foot-regolith-normal.webp',
];

mkdirSync(OUT, { recursive: true });
for (const file of FILES) {
  const name = file.split('/').pop();
  copyFileSync(fileURLToPath(new URL(file, WEB)), `${OUT}${name}`);
  process.stdout.write(`media/textures/${name}\n`);
}
