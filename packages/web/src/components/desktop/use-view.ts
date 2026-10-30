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
 * The view the header's tabs chose (lib/view-tabs.ts), re-rendering on
 * every switch, and the tabs kept marked to match. The globe on the
 * server and while hydrating, as the static page shows it.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { markCurrentTab, viewOfHash, type View } from '../../lib/view-tabs';

const subscribeHash = (onChange: () => void): (() => void) => {
  addEventListener('hashchange', onChange);
  return () => removeEventListener('hashchange', onChange);
};

const currentView = (): View => viewOfHash(location.hash);

/** The chosen view; `nav` is the selector of the tabs to keep marked. */
export function useView(nav: string): View {
  const view = useSyncExternalStore(subscribeHash, currentView, (): View => 'globe');
  useEffect(() => {
    const tabs = document.querySelector(nav);
    if (tabs) markCurrentTab(tabs, view);
  }, [nav, view]);
  return view;
}
