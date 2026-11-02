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
 * Where the on-foot view's tier starts and the rung below it (VENT-49): the
 * device's tier, or a lower one kept this session, unless the address forced
 * one. See view-tier.ts for the store they serve.
 */
import { TIERS, type Tier } from '../lib/quality';
import { keptTier, type TierStorage } from './view-tier-memory';

export interface ViewTierState {
  readonly tier: Tier;
  /** Whether a slow frame may lower it: not forced, not at the lowest. */
  readonly steppable: boolean;
}

/** What the device says, read once. */
export interface ViewTierDevice {
  readonly tier: Tier;
  /** The address forced the tier. */
  readonly forced: boolean;
}

export interface ViewTierOptions {
  readonly start: () => ViewTierDevice;
  readonly storage: () => TierStorage | null;
}

/** The store's facts once started. */
export interface ViewTierLive {
  readonly forced: boolean;
  readonly storage: TierStorage | null;
  readonly state: ViewTierState;
}

const rung = (tier: Tier): number => TIERS.indexOf(tier);

/** The state of `tier` under an address that forced one, or did not. */
export const stateOf = (tier: Tier, forced: boolean): ViewTierState =>
  ({ tier, steppable: !forced && tier !== 'low' });

/** The tier one rung down; low stays low. */
export const lowerRung = (tier: Tier): Tier => TIERS[rung(tier) - 1] ?? 'low';

/**
 * Reads the device and the session's memory: the device's tier, or the
 * kept one when it is lower; a tier the address forced wins over memory.
 */
export function begin(options: ViewTierOptions): ViewTierLive {
  const { tier, forced } = options.start();
  const storage = options.storage();
  const kept = forced ? null : keptTier(storage);
  const from = kept && rung(kept) < rung(tier) ? kept : tier;
  return { forced, storage, state: stateOf(from, forced) };
}
