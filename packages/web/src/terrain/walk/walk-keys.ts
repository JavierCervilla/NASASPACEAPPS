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
 * The keys that walk (VENT-121): on the focused view ↑ glides 10 m forward
 * along the heading and ↓ 10 m back, as Street View's arrows do; ← and →
 * still turn, and Page Up and Page Down took the pitch over from ↑ and ↓
 * (look-input.ts). Pure.
 */
import type { Look } from '../view-camera';
import type { EastNorth } from './walk-reach';

/** One key's step, metres. */
export const WALK_STEP_M = 10;

const STEPS: Readonly<Record<string, number>> = {
  ArrowUp: WALK_STEP_M,
  ArrowDown: -WALK_STEP_M,
};

/** The step east and north of `key` along `look`'s heading; null: none. */
export function keyStep(look: Look, key: string): EastNorth | null {
  const metres = STEPS[key];
  if (metres === undefined) return null;
  const yaw = (look.yawDeg * Math.PI) / 180;
  return [Math.sin(yaw) * metres, Math.cos(yaw) * metres];
}
