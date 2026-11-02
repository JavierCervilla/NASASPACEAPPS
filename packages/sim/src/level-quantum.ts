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
 * The 16-bit step of each level's tiles (VENT-46), apart from the codec so
 * the step stays one decision: see `tile-quant.ts` for what it is used for.
 */
import { MIN_QUANTUM_M } from './tile-quant.ts';

/**
 * The step of every tile of `level`, metres: 0.1 m at levels 0 and 1 (an
 * error of at most 0.05 m, far under their 15.6 and 62.5 m spacing), then
 * doubled per level: 0.2 m at level 2 (13 km of relief) and 0.4 m at level 3
 * (26 km, more than the Moon's 20 km from its lowest floor to its highest
 * rim). Exact in a double.
 */
export function levelQuantumM(level: number): number {
  return MIN_QUANTUM_M * 2 ** Math.max(0, level - 1);
}
