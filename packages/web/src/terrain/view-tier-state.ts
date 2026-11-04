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
import { wasOpenWithin } from './view-tier-local';
import {
  keepTier,
  keptTier,
  wasOpen,
  type TierStorage,
} from './view-tier-memory';

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
  /**
   * The persistent storage that also keeps the open mark (VENT-69), and the
   * clock its TTL reads; none: only the session's mark.
   */
  readonly local?: (() => TierStorage | null) | undefined;
  readonly nowMs?: (() => number) | undefined;
}

/** The store's facts once started. */
export interface ViewTierLive {
  readonly forced: boolean;
  readonly storage: TierStorage | null;
  /** The persistent storage and the clock of the open mark (VENT-69). */
  readonly local: TierStorage | null;
  readonly nowMs: () => number;
  readonly state: ViewTierState;
  /** Why the tier starts a rung lower than it would have; null: it does not. */
  readonly note: string | null;
}

const rung = (tier: Tier): number => TIERS.indexOf(tier);
/** What the crash report says of a run its page did not unmount. */
const DIED = 'previous run ended without unmount';

/** The state of `tier` under an address that forced one, or did not. */
export const stateOf = (tier: Tier, forced: boolean): ViewTierState =>
  ({ tier, steppable: !forced && tier !== 'low' });

/** The tier one rung down; low stays low. */
export const lowerRung = (tier: Tier): Tier => TIERS[rung(tier) - 1] ?? 'low';

/** Whether a page before this one left the view open, in either storage. */
const diedOpen = (
  storage: TierStorage | null,
  local: TierStorage | null,
  nowMs: number,
): boolean => wasOpen(storage) || wasOpenWithin(local, nowMs);

/**
 * Reads the device and the session's memory: the device's tier, or the
 * kept one when it is lower, a rung lower again (and kept) when the page
 * before died with the view open (VENT-51; the mark also lives 24 hours in
 * `localStorage`, so a browser restart does not lose it, VENT-69); a tier
 * the address forced wins over memory.
 */
export function begin(options: ViewTierOptions): ViewTierLive {
  const { tier, forced } = options.start();
  const storage = options.storage();
  const local = options.local?.() ?? null;
  const nowMs = options.nowMs ?? Date.now;
  const kept = forced ? null : keptTier(storage);
  const from = kept && rung(kept) < rung(tier) ? kept : tier;
  const live = { forced, storage, local, nowMs };
  if (forced || from === 'low' || !diedOpen(storage, local, nowMs())) {
    return { ...live, state: stateOf(from, forced), note: null };
  }
  const lower = lowerRung(from);
  keepTier(storage, lower);
  const note = `tier dropped to ${lower}: ${DIED}`;
  return { ...live, state: stateOf(lower, forced), note };
}
