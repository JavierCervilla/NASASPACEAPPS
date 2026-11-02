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
 * What the phone's Globe, DSN and Horizon tabs do (VENT-7, VENT-34): DSN
 * shows the DSN view (its hash, so the back button leaves it) with the
 * sheet at half, where it says who listens; Horizon shows the on-foot view
 * with the sheet at peek, so the ground fills the screen; Globe leaves
 * either and closes the sheet, as before.
 */
import type { DetentName } from '../sheet/sheet-physics';
import { goToView, type View } from '../lib/view-tabs';

interface Sheet {
  readonly close: () => void;
  readonly setDetent: (detent: DetentName) => void;
}

/** The tab of `view` while the sheet is not at full. */
export const tabOf = (view: View): 'dsn' | 'horizon' | 'globe' =>
  view === 'dsn' || view === 'horizon' ? view : 'globe';

export function viewActions(
  place: { hash: string },
  view: View,
  sheet: Sheet,
) {
  return {
    onGlobe: (): void => {
      if (view === 'dsn' || view === 'horizon') goToView(place, 'globe');
      sheet.close();
    },
    onDsn: (): void => {
      goToView(place, 'dsn');
      sheet.setDetent('half');
    },
    onHorizon: (): void => {
      goToView(place, 'horizon');
      sheet.setDetent('peek');
    },
  };
}
