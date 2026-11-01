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
 * The globe's side of the pin (VENT-10, VENT-37): the viewport registered
 * as a place to drop it on, once the scene runs, where a click or a held
 * finger places it, the pin standing on its point, which a tap selects
 * again, and the first-time hint over the Moon.
 */
import type { RefObject } from 'react';
import type { GlobeView } from '../../globe/globe-view';
import type { SiteStore } from '../../phone/site-store';
import { useSelection } from '../phone/hooks';
import { PinHint } from './PinHint';
import { StandingPin } from './StandingPin';
import { useGlobeSurface } from './use-surface';

interface Props {
  readonly host: RefObject<HTMLElement | null>;
  readonly view: GlobeView | null;
  readonly store: SiteStore;
}

export function GlobePin({ host, view, store }: Props) {
  const surface = useGlobeSurface(host, view);
  const { id } = useSelection(store);
  const select = (picked: string): void => store.select(picked, 'globe');
  const pin = { surface, selected: id, onSelect: select };
  return (
    <>
      <StandingPin {...pin} />
      <PinHint />
    </>
  );
}
