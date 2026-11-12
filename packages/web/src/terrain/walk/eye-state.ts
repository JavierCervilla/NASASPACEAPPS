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
 * The state where the eye stands (VENT-121): the pill's rule
 * (phone/now-widget.ts `nowState`, the sim's `hasSun` and `hasEarth`) fed
 * with the Sun and the Earth as the eye sees them over the terrain
 * (eye-sight.ts), so «Window here» means what «Window» means on the pill:
 * the Sun over the terrain, and the Earth over it and 3° up. Pure.
 */
import { nowState } from '../../phone/now-widget';
import type { NowState } from '../../phone/widget-types';

export interface EyeSky {
  readonly sunEl: number;
  readonly earthEl: number;
  /** The Sun over the terrain the eye sees. */
  readonly sunClear: boolean;
  readonly earthClear: boolean;
}

/** The signal state of `sky` where the eye stands. */
export function eyeState(sky: EyeSky): NowState {
  const sample = { sunEl: sky.sunEl, earthEl: sky.earthEl,
    sunAboveTerrain: sky.sunClear, earthAboveTerrain: sky.earthClear };
  return nowState(sample);
}
