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
 * Opening a closed sheet by dragging up from the tab bar's edge: the
 * sheet rises 1:1 under the finger (it is off-screen, so the first pixels
 * of travel only bring its edge into view), and a release that the
 * momentum projection carries above closed opens it at half; otherwise it
 * goes back down.
 */
import type { SheetDragTarget } from './sheet-drag';
import type { SheetMotion } from './sheet-motion';
import { releaseDetent } from './sheet-physics';
import type { SheetState } from './sheet-state';

/** The drag target of the edge, over the sheet's own motion. */
export function edgeDragTarget(
  state: SheetState,
  motion: SheetMotion,
): SheetDragTarget {
  return {
    grab: () => motion.grab(),
    drag: (dy) => motion.drag(dy),
    release: (vy) => {
      const lands = releaseDetent(state.detents, state.axis.value, vy);
      motion.moveTo(lands === 'closed' ? 'closed' : 'half', vy);
    },
  };
}
