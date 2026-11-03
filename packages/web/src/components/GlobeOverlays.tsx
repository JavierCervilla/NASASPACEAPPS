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
 * What floats over the running globe and answers to it: the pin standing
 * on the Moon with the first-time hint (VENT-10, VENT-37), and the compass
 * in the corner (VENT-50).
 */
import type { RefObject } from 'react';
import type { TimeStore } from '../calendar/time-store';
import type { GlobeCompass } from '../globe/compass-link';
import type { GlobeView } from '../globe/globe-view';
import type { SiteStore } from '../phone/site-store';
import { CompassButton } from './compass/CompassButton';
import { GlobePin } from './pin/GlobePin';

interface Props {
  readonly host: RefObject<HTMLElement | null>;
  /** The mounted globe's view and compass; null before it runs. */
  readonly view: GlobeView | null;
  readonly compass: GlobeCompass | null;
  readonly store: SiteStore;
  readonly time: TimeStore;
}

export function GlobeOverlays({ host, view, compass, store, time }: Props) {
  return (
    <>
      <GlobePin host={host} view={view} store={store} />
      <CompassButton compass={compass} time={time} />
    </>
  );
}
