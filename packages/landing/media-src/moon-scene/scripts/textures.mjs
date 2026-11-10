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
 * `<out>/textures/`, where moon-scene's shaders read them: a raea render
 * reads its own media folder only. Nothing is downloaded.
 *
 *   node packages/landing/media-src/moon-scene/scripts/textures.mjs --out <composition>/media/moon
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argOf } from './sites.mjs';

const WEB = new URL('../../../../web/', import.meta.url);
const OUT = `${resolve(argOf('out', '.'))}/textures/`;
const FILES = [
  'public/textures/moon-lroc-4k.jpg',
  'public/textures/moon-lola-normal-4k.jpg',
  'src/terrain/maps/on-foot-earth.webp',
];

mkdirSync(OUT, { recursive: true });
for (const file of FILES) {
  const name = file.split('/').pop();
  copyFileSync(fileURLToPath(new URL(file, WEB)), `${OUT}${name}`);
  process.stdout.write(`${OUT}${name}\n`);
}
