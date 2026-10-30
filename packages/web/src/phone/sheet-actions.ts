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
 * sheet closed» and «Phone · calendar»): the site pill and Sites open the
 * picker at full; Calendar opens the calendar at full; Globe and the
 * picker's Done close the sheet, leaving only the Moon, the top bar and
 * the tab bar; a site picked from the list shows its summary at half.
 */
import type { DetentName } from '../sheet/sheet-physics';

/** What fills the sheet at full: the site picker or the calendar. */
export type SheetView = 'sites' | 'calendar';

export interface SheetActions {
  /** Globe, or Done: the sheet leaves the screen. */
  readonly close: () => void;
  /** The site pill, or Sites: the picker at full. */
  readonly open: () => void;
  /** A site from the list: selected, and its summary at half. */
  readonly pick: (id: string) => void;
  /** Calendar: the calendar at full. */
  readonly calendar: () => void;
}

export function sheetActions(
  setDetent: (detent: DetentName) => void,
  select: (id: string) => void,
  setView: (view: SheetView) => void,
): SheetActions {
  const show = (view: SheetView): void => {
    setView(view);
    setDetent('full');
  };
  return {
    close: () => setDetent('closed'),
    open: () => show('sites'),
    calendar: () => show('calendar'),
    pick: (id) => {
      select(id);
      setDetent('half');
    },
  };
}
