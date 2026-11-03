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
 * The session's memory of the on-foot view's tier (VENT-49): once a slow
 * frame or a lost context took the view down, a reload opens it there, with
 * no second trial of the tier that failed. Storage can be missing or refuse
 * access (private modes, blocked cookies): then nothing is kept and nothing
 * breaks.
 */
import { TIERS, type Tier } from '../lib/quality';

/** The part of `Storage` the memory uses. */
export type TierStorage = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'ventana.onFootTier';

/** The session's storage, or null when the browser refuses it. */
export function tierStorage(): TierStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** The tier kept for this session, or null. */
export function keptTier(storage: TierStorage | null): Tier | null {
  try {
    const kept = storage?.getItem(KEY);
    return TIERS.find((tier) => tier === kept) ?? null;
  } catch {
    return null;
  }
}

/** Keeps `tier` for the rest of the session. */
export function keepTier(storage: TierStorage | null, tier: Tier): void {
  try {
    storage?.setItem(KEY, tier);
  } catch {
    // Full or refused storage: the next load starts at the device's tier.
  }
}
