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
 * Every page load the benchmark makes (VENT-81) leaves on purpose: the
 * on-foot view's open mark is cleared as the language switch clears it
 * (view-tier-open.ts `leftOnPurpose`), so the next load counts no death,
 * and the tier a slow frame kept for the session is forgotten
 * (view-tier-memory.ts), so every run starts from the device's tier.
 */
import { glStorage, type GlStorage } from '../lib/gl-marks';
import { leftOnPurpose } from '../terrain/view-tier-open';
import { TIER_KEY } from '../terrain/view-tier-memory';

export interface LeaveDeps {
  /** The session's storage, where the tier and the open mark live. */
  readonly session: Storage | null;
  /** Where the open mark is kept across a browser restart. */
  readonly local: GlStorage | null;
  readonly replace: (href: string) => void;
}

/** Clears the marks and opens `href` in place of this page. */
export function leaveTo(href: string, deps: LeaveDeps): void {
  try {
    deps.session?.removeItem(TIER_KEY);
  } catch {
    // Refused storage keeps nothing to forget.
  }
  leftOnPurpose(deps.session, deps.local);
  deps.replace(href);
}

/** This page's storages and address. */
export function pageLeave(): LeaveDeps {
  let session: Storage | null = null;
  try {
    session = globalThis.sessionStorage ?? null;
  } catch {
    session = null;
  }
  return { session, local: glStorage(),
    replace: (href) => location.replace(href) };
}
