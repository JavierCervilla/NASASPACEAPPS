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
 * What the phone's controls do to the sheet (validated canvas «Phone ·
 * sheet closed»): the site pill and Sites open the picker at full; Globe
 * and the picker's Done close the sheet, leaving only the Moon, the top
 * bar and the tab bar; a site picked from the list shows its summary at
 * half.
 */
import type { DetentName } from '../sheet/sheet-physics';

export interface SheetActions {
  /** Globe, or Done: the sheet leaves the screen. */
  readonly close: () => void;
  /** The site pill, or Sites: the picker at full. */
  readonly open: () => void;
  /** A site from the list: selected, and its summary at half. */
  readonly pick: (id: string) => void;
}

export function sheetActions(
  setDetent: (detent: DetentName) => void,
  select: (id: string) => void,
): SheetActions {
  return {
    close: () => setDetent('closed'),
    open: () => setDetent('full'),
    pick: (id) => {
      select(id);
      setDetent('half');
    },
  };
}
