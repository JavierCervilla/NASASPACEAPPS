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
 * Hands the globe's view (globe-view.ts) to the page while the globe is
 * mounted (VENT-10), and tells it after each drawn frame, so the pin
 * standing on the Moon follows the globe as it turns (VENT-37).
 */
import { createWatchedValue } from '../lib/watched-value';
import { globeView, type GlobeView } from './globe-view';
import type { Stage } from './stage';

export function linkView(
  stage: Stage,
  onView: ((view: GlobeView | null) => void) | undefined,
) {
  const frames = createWatchedValue(0);
  onView?.(globeView(stage, { subscribe: frames.subscribe }));
  return {
    /** Calls a listener after every drawn frame (the compass's, too). */
    subscribe: frames.subscribe,
    /** A frame was drawn. */
    drawn: (): void => frames.set(frames.get() + 1),
    /** The globe is going: the page forgets its view. */
    unlink: (): void => onView?.(null),
  };
}
