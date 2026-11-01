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
 * after a saved site is deleted, a glass pill above the tab bar (over the
 * calendar strip on desktop) offers it back for five seconds, said by a
 * polite live region. The region is always there, empty, so the message
 * is announced when it comes. Undo puts the site back where it was; the
 * time stops while the focus or the pointer is on it.
 */
import { useI18n } from '../i18n-context';
import { useWatched } from '../pin/context';
import { useSavedKit } from './context';

export function UndoToast() {
  const kit = useSavedKit();
  const i18n = useI18n();
  const offer = useWatched(kit?.undo.current ?? null, null);
  return (
    <div className="undo-toast" role="status" data-open={offer !== null} onFocus={() => kit?.undo.hold()} onBlur={() => kit?.undo.release()} onPointerEnter={() => kit?.undo.hold()} onPointerLeave={() => kit?.undo.release()}>
      {offer ? (
        <>
          <span className="undo-toast__text">
            {i18n.t('saved.deleted', { name: offer.site.name })}
          </span>
          <button type="button" className="undo-toast__undo" onClick={() => kit?.undo.undo()}>
            {i18n.t('saved.undo')}
          </button>
        </>
      ) : null}
    </div>
  );
}
