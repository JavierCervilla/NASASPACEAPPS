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
 * What a saved site's row knows and does (VENT-37): the state at its point
 * at the shared instant, the words for it, and its menu's actions (copy
 * the coordinates and say so; delete and offer the undo; rename).
 */
import type { TextKey } from '../../i18n/catalogue';
import { formatCoords } from '../../i18n/format';
import type { I18n } from '../../i18n/translate';
import type { NowState } from '../../phone/widget-types';
import type { SavedSite } from '../../saved/saved-schema';
import { useI18n } from '../i18n-context';
import { useInstant, usePin } from '../pin/context';
import { useSavedKit } from './context';
import type { RowAction } from './RowMenu';

/** The state as a row says it, «Window», «Sun only»… */
export const STATE_WORDS: Readonly<Record<NowState, TextKey>> = {
  window: 'state.line.window',
  sun: 'state.badge.sun',
  earth: 'state.badge.earth',
  none: 'state.badge.none',
};

/** The state at the site: the card's when selected, else the simulator's. */
export function useRowState(
  site: SavedSite,
  selected: boolean,
  state: NowState | null,
): NowState | null {
  const pin = usePin();
  const atMs = useInstant(pin);
  if (selected) return state;
  return pin && atMs !== null ? pin.stateAt(site) : null;
}

/** Copies `site`'s point and says whether it worked. */
async function copyPoint(
  i18n: I18n,
  site: SavedSite,
  say: (text: string) => void,
): Promise<void> {
  const coords = formatCoords(i18n, site.lat, site.lonEast);
  try {
    await navigator.clipboard.writeText(coords);
    say(i18n.t('saved.copied', { coords }));
  } catch {
    say(i18n.t('saved.copyFailed'));
  }
}

/** Copy and delete for `site`'s menu, and its rename. */
export function useRowActions(site: SavedSite, onDeleted: () => void) {
  const kit = useSavedKit();
  const pin = usePin();
  const i18n = useI18n();
  const act = (action: Exclude<RowAction, 'rename'>): void => {
    if (action === 'copy') {
      void copyPoint(i18n, site, (text) => pin?.live.set(text));
      return;
    }
    const removed = kit?.saved.remove(site.id);
    if (removed) kit?.undo.offer(removed);
    onDeleted();
  };
  const rename = (name: string): void => kit?.saved.rename(site.id, name);
  return { act, rename };
}
