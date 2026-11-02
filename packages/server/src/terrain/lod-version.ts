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
 * The version token of the levelled tiles (VENT-46): which tiers answered.
 * A tier fetched later (VENT-43) changes it, so a client keeps its tiles
 * for ever under a token and asks for the list again to learn the new one.
 */
import { createHash } from 'node:crypto';
import type { Tier } from './catalogue.ts';

/** Bumped when the method changes, so old tiles are not served. */
const METHOD_VERSION = 'lod-v1';
const TOKEN_LENGTH = 8;

/** Eight hex digits naming the method and the tiers present. */
export function lodVersion(present: readonly Tier[]): string {
  const ids = present.map((t) => t.id).join('+');
  return createHash('sha256')
    .update(`${METHOD_VERSION}:${ids}`)
    .digest('hex')
    .slice(0, TOKEN_LENGTH);
}
