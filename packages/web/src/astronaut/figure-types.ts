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
 * The astronaut's pictures (VENT-10): two poses, standing and carried
 * (tilted, as if lifted by the hand), each with the visor in every colour
 * it can wear: neutral silver in the dock or off the Moon, else the state
 * of the point under it. They are baked offline from the 3D model into
 * one sprite sheet (scripts/astronaut-figures.mjs: figures.webp, laid out
 * by figures.json, rows {@link POSES}, columns {@link VISORS}), so the
 * page draws no 3D for the figure. Pure.
 */
import type { NowState } from '../phone/widget-types';

export type Pose = 'stand' | 'carry';
export type Visor = 'idle' | NowState;

export const POSES: readonly Pose[] = ['stand', 'carry'];
export const VISORS: readonly Visor[] = [
  'idle', 'window', 'sun', 'earth', 'none',
];

/**
 * Each picture's size in px, and where the feet are in it, as a share of
 * each side: the page puts that point on the dropped one.
 */
export const PICTURE = { width: 180, height: 220, feetX: 0.5, feetY: 0.95 };

/** The token of each state's colour (styles/tokens.css): the bake's. */
export const VISOR_TOKENS: Readonly<Record<NowState, string>> = {
  window: '--signal-window',
  sun: '--signal-sun',
  earth: '--signal-earth',
  none: '--signal-none',
};
