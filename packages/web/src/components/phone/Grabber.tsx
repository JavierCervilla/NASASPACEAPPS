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
 * The sheet's grabber: the pill at its top edge, and a button that
 * cycles the detents from the keyboard, named for where the sheet is and
 * where a press takes it.
 */
import type { DetentName } from '../../sheet/sheet-physics';
import { grabberLabel, nextDetent } from '../../sheet/sheet-view';
import { useI18n } from '../i18n-context';

interface Props {
  readonly detent: DetentName;
  readonly onDetent: (detent: DetentName) => void;
}

/** A button that cycles the detents from the keyboard. */
export function Grabber({ detent, onDetent }: Props) {
  const i18n = useI18n();
  return (
    <button
      type="button"
      className="sheet__grabber"
      aria-label={grabberLabel(i18n, detent)}
      aria-expanded={detent === 'full'}
      onClick={() => onDetent(nextDetent(detent))}
    >
      <span className="sheet__bar" />
    </button>
  );
}

