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
 * The astronaut's files (VENT-34): the rigged glb and the three WebP maps
 * it names, by the URI inside the glb. A module of its own, so the bundler
 * ships them to the on-foot view only (the service worker's ON_DEMAND
 * list leaves them out of the precache).
 */
import normal from '../../../models/astronaut-meshy-0.webp?url';
import baseColor from '../../../models/astronaut-meshy-1.webp?url';
import metalRough from '../../../models/astronaut-meshy-2.webp?url';
import glb from '../../../models/astronaut-meshy.glb?url';
import type { ModelFiles } from './model-files';

const files: ModelFiles = {
  glb,
  images: {
    'astronaut-meshy-0.webp': normal,
    'astronaut-meshy-1.webp': baseColor,
    'astronaut-meshy-2.webp': metalRough,
  },
};

export default files;
