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
 * Whether the on-foot view draws the scanned rocks at its tier (VENT-124),
 * for the caption's credit: the same answer the scene reaches from the
 * tier's policy and the address (rock-look.ts `scansDrawn`), and false
 * once the scene says their files failed (the stones stand in).
 */
import { useState, useSyncExternalStore } from 'react';
import { groundPolicy } from '../../terrain/ground-policy';
import { parseLeaveOut } from '../../terrain/leave-out';
import { parseRockLook, scansDrawn } from '../../terrain/rock-look';
import type { ViewTier } from '../../terrain/view-tier';

/**
 * `drawn`: true while the view's tier and address draw the scans and their
 * files did not fail; `onScans` hears the scene's load (true: loaded).
 */
export function useScansDrawn(view: ViewTier) {
  const { tier } = useSyncExternalStore(view.subscribe, view.get, view.get);
  const [loaded, setLoaded] = useState(true);
  const { search } = window.location;
  const { rocksCap } = groundPolicy(tier, parseLeaveOut(search));
  const drawn = loaded && scansDrawn(rocksCap, parseRockLook(search));
  return { drawn, onScans: setLoaded };
}
