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
 * The on-foot view's open mark (VENT-51): set while the view is mounted, so
 * a page that dies with it open (a GPU reset can take a phone's page down
 * with no lost context told) leaves it set, and the next page's tier starts
 * a rung lower (view-tier-state.ts). Leaving the view clears it; a tier
 * switch or «Try again» inside the view does not touch it. A reload with
 * the view open counts as a death too: a page hung on its GPU is ended by
 * the person's reload, and telling the two apart is not possible from here.
 */
import { glStorage } from '../lib/gl-marks';
import { keepOpenSince } from './view-tier-local';
import { keepOpen, tierStorage } from './view-tier-memory';
import type { ViewTierLive } from './view-tier-state';

export interface OpenMarks {
  /**
   * The view opened. Returns why this page's tier starts a rung lower, the
   * first time only; null otherwise.
   */
  readonly opened: () => string | null;
  /** The view unmounted. */
  readonly closed: () => void;
}

/** The marks over the store's facts, read through `now`. */
export function openMarks(now: () => ViewTierLive): OpenMarks {
  let told = false;
  return {
    opened: () => {
      const { storage, local, nowMs, note } = now();
      keepOpen(storage, true);
      keepOpenSince(local, true, nowMs());
      const first = !told;
      told = true;
      return first ? note : null;
    },
    closed: () => {
      const { storage, local, nowMs } = now();
      keepOpen(storage, false);
      keepOpenSince(local, false, nowMs());
    },
  };
}

/**
 * The app leaves the page on purpose with the view maybe open (a language
 * switch, VENT-52): not a death, so the next page's tier keeps its rung. If
 * the next page opens the view again, it marks it open again.
 */
export function leftOnPurpose(
  storage = tierStorage(),
  local = glStorage(),
): void {
  keepOpen(storage, false);
  keepOpenSince(local, false, Date.now());
}
