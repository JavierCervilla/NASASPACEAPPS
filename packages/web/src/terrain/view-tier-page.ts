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
 * The page's on-foot view tier (VENT-49): the device's tier through the
 * quality pick (a phone never opens at high), and whether the address
 * forced one. Everything is read when the view first asks, so the page's
 * start pays nothing.
 */
import { pickQuality } from '../globe/quality-pick';
import { forcedTier } from '../lib/quality';
import { isPhoneViewport } from '../lib/viewport';
import { createViewTier, type ViewTier } from './view-tier';
import { tierStorage } from './view-tier-memory';

/** The store the page's on-foot view reads, made once with the page. */
export function pageViewTier(): ViewTier {
  return createViewTier({
    start: () => ({
      tier: pickQuality(isPhoneViewport()).tier,
      forced: forcedTier(location.search, location.hash) !== null,
    }),
    storage: tierStorage,
  });
}
