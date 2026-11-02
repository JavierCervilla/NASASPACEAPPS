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
 * What a quality tier draws of the rings (VENT-46): how many levels of
 * the aligned tiling (2, 8, 32 and 128 km) and, per level, how many nodes
 * a mesh cell skips. The budget on the high tier: 4 levels of a 256 x 256
 * cell window, 131 k triangles each, 520 k in all and about 36 draw calls;
 * a phone drops level 0 and 1 to every second node (and the medium tier
 * level 0 only), and the lowest tier stops at 32 km, the horizon profile's
 * backdrop standing in beyond. Pure.
 */
import type { Tier } from '../../lib/quality';

export interface RingTier {
  /** Levels drawn, from the finest: 0 .. levels - 1. */
  readonly levels: number;
  /** Nodes skipped per mesh cell, by level (1: every node). */
  readonly strides: readonly number[];
}

const TIERS: Readonly<Record<Tier, RingTier>> = {
  high: { levels: 4, strides: [1, 1, 1, 1] },
  medium: { levels: 4, strides: [2, 1, 1, 1] },
  low: { levels: 3, strides: [2, 2, 1] },
};

/** The rings a tier draws. */
export const ringTier = (tier: Tier): RingTier => TIERS[tier];

/** The backdrop's radius: past the rings' corners (181 km), or at 40 km. */
export const backdropM = ({ levels }: RingTier): number =>
  levels >= 4 ? 190_000 : 40_000;
