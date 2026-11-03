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
 * The on-foot view's tier for the page session (VENT-49): one store both
 * the scene (pixel ratio, antialiasing, shadow map) and the relief rings read,
 * so a change remounts them together at the new tier. It starts at the
 * device's tier (read when the view first asks, never at page load), steps
 * down one rung when a slow frame says so, drops to `low` after a lost
 * context, and is kept for the session (view-tier-memory.ts). A tier the
 * address forced (`?quality=`) is never stepped down, so the tests stay
 * deterministic; only a lost context overrides it. A page that died with
 * the view open starts the next page's a rung lower (view-tier-open.ts).
 */
import type { Tier } from '../lib/quality';
import { keepTier } from './view-tier-memory';
import { openMarks, type OpenMarks } from './view-tier-open';
import {
  begin,
  lowerRung,
  stateOf,
  type ViewTierLive,
  type ViewTierOptions,
  type ViewTierState,
} from './view-tier-state';

export interface ViewTier extends OpenMarks {
  /** The same object until the tier changes. */
  readonly get: () => ViewTierState;
  /** One rung down, unless forced or already at the lowest. */
  readonly stepDown: () => void;
  /** The GPU context was lost: `low`, whatever the address forced. */
  readonly afterLoss: () => void;
  /** Hears each change; returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

export function createViewTier(options: ViewTierOptions): ViewTier {
  const listeners = new Set<() => void>();
  let live: ViewTierLive | null = null;
  const now = (): ViewTierLive => (live ??= begin(options));
  const change = (tier: Tier): void => {
    const was = now();
    if (was.state.tier === tier) return;
    live = { ...was, state: stateOf(tier, was.forced) };
    keepTier(was.storage, tier);
    listeners.forEach((listener) => listener());
  };
  return {
    get: () => now().state,
    stepDown: () => {
      const { tier, steppable } = now().state;
      if (steppable) change(lowerRung(tier));
    },
    afterLoss: () => change('low'),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    ...openMarks(now),
  };
}
