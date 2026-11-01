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
 * What the undo toast (UndoToast.tsx) says and where it sends the focus
 * (VENT-37): «Deleted Cabeus ridge» for one delete, «Deleted 2 sites» for
 * more; after Undo the focus goes to the site put back, after Escape to
 * the row now where the last one stood. And a press on Undo is not a
 * click outside the site popover it was made in, which stays open.
 */
import type { I18n } from '../../i18n/translate';
import type { UndoOffer } from '../../saved/undo';

/** The toast's words for `offer`. */
export function undoMessage(i18n: I18n, offer: UndoOffer): string {
  const [only] = offer.removed;
  if (only && offer.removed.length === 1) {
    return i18n.t('saved.deleted', { name: only.site.name });
  }
  return i18n.plural('saved.deletedMany', offer.removed.length);
}

/** The «Saved» list rows the visitor sees (the popover's or the sheet's). */
function shownRows(): HTMLElement[] {
  const rows = document.querySelectorAll<HTMLElement>('.saved-row__pick');
  return [...rows].filter((row) => row.checkVisibility());
}

/**
 * On the next frame (the list has drawn the change), focuses the row of
 * the site `id`, or else the row at `index` (the last one if fewer).
 */
export function focusSavedRow(id: string | null, index: number): void {
  requestAnimationFrame(() => {
    const rows = shownRows();
    const own = rows.find((row) => row.dataset['savedId'] === id);
    (own ?? rows[Math.min(index, rows.length - 1)])?.focus();
  });
}

/**
 * Makes `button` an invoker that only shows the open site popover, so the
 * browser's light dismiss counts a press on it as inside that popover and
 * its click leaves it open; none when no popover is open.
 */
export function keepPopoverOpen(button: HTMLButtonElement): void {
  const open = document.querySelector<HTMLElement>(
    '[popover="auto"]:popover-open',
  );
  button.popoverTargetElement = open;
  button.popoverTargetAction = 'show';
}
