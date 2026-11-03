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
 * «Deleted Cabeus ridge · Undo» (VENT-37, validated canvas «DeleteUndo»):
 * after a saved site is deleted, a row in the «New version ready» look
 * (VENT-57, V-11, variant B: a trash mark, the words and a bold «Undo»)
 * above the tab bar, or above the calendar strip on desktop
 * (undo-anchor.ts), offers it back for five seconds, said by a polite
 * live region. The region is always there, empty, so the message
 * is announced when it comes. Deletes in a row join one offer, «Deleted 2
 * sites», and Undo puts every one back where it was. The time stops while
 * the focus or the pointer is on it. A delete made from the keyboard sends
 * the focus to Undo, so it is never out of reach (the time stops there);
 * Undo then focuses the site put back, and Escape lets the offer go and
 * focuses the row now in the deleted one's place. Pressing Undo leaves the
 * desktop site popover open (undo-parts.ts).
 */
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { UndoOffer } from '../../saved/undo';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { useWatched } from '../pin/context';
import { useSavedKit, type SavedKit } from './context';
import { useUndoAnchor } from './undo-anchor';
import { focusSavedRow, keepPopoverOpen, undoMessage } from './undo-parts';

/** The last delete on offer: where the focus goes back to. */
const lastOf = (offer: UndoOffer | null) => offer?.removed.at(-1) ?? null;

/** Undo, and Escape, each with the focus sent back to the list. */
function useUndoActions(kit: SavedKit | null, offer: UndoOffer | null) {
  const undo = (): void => {
    const last = lastOf(offer);
    kit?.undo.undo();
    if (last) focusSavedRow(last.site.id, last.index);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const last = lastOf(offer);
    if (event.key !== 'Escape' || !last) return;
    // Handled here: Escape must not close the site popover too.
    event.preventDefault();
    event.stopPropagation();
    kit?.undo.dismiss();
    focusSavedRow(null, last.index);
  };
  return { undo, onKeyDown };
}

export function UndoToast() {
  const kit = useSavedKit();
  const i18n = useI18n();
  const offer = useWatched(kit?.undo.current ?? null, null);
  const button = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const { undo, onKeyDown } = useUndoActions(kit, offer);
  useUndoAnchor(row, offer !== null);
  useEffect(() => {
    if (offer?.fromKeyboard) button.current?.focus();
  }, [offer]);
  return (
    <div ref={row} className="undo-toast" role="status" data-open={offer !== null} onKeyDown={onKeyDown} onFocus={() => kit?.undo.hold()} onBlur={() => kit?.undo.release()} onPointerEnter={() => kit?.undo.hold()} onPointerLeave={() => kit?.undo.release()}>
      {offer ? (
        <>
          <Icon name="delete" className="notice-row__mark" />
          <span className="undo-toast__text">{undoMessage(i18n, offer)}</span>
          <button ref={button} type="button" className="undo-toast__undo" onPointerDown={(e) => keepPopoverOpen(e.currentTarget)} onClick={undo}>
            {i18n.t('saved.undo')}
          </button>
        </>
      ) : null}
    </div>
  );
}
