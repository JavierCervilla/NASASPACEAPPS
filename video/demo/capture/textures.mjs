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
 * Copies the textures the app ships (ASSETS.md credits each one) into
 * video/demo/media/textures/, where the 3D Moon of the videos reads them:
 * a render reads its media folder only. Run once before rendering.
 *
 *   node video/demo/capture/textures.mjs
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../../../packages/web/', import.meta.url);
const OUT = fileURLToPath(new URL('../media/textures/', import.meta.url));
const FILES = [
  'public/textures/moon-lroc-4k.jpg',
  'public/textures/moon-south-polar-2k.jpg',
  'public/textures/moon-lola-normal-4k.jpg',
  'src/terrain/maps/on-foot-earth.webp',
];

mkdirSync(OUT, { recursive: true });
for (const file of FILES) {
  const name = file.split('/').pop();
  copyFileSync(fileURLToPath(new URL(file, ROOT)), `${OUT}${name}`);
  process.stdout.write(`media/textures/${name}\n`);
}
