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
 * The Apollo Lunar Module's files (VENT-46): the glb and the three WebP
 * maps it names, by the URI inside the glb. A module of its own, so only
 * an Apollo site downloads them.
 */
import foilNormal from '../../../models/apollo-lm-0.webp?url';
import foilMetal from '../../../models/apollo-lm-1.webp?url';
import booster from '../../../models/apollo-lm-2.webp?url';
import glb from '../../../models/apollo-lm.glb?url';
import type { ModelFiles } from './model-files';

const files: ModelFiles = {
  glb,
  images: {
    'apollo-lm-0.webp': foilNormal,
    'apollo-lm-1.webp': foilMetal,
    'apollo-lm-2.webp': booster,
  },
};

export default files;
