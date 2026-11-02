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
 * How long the page waits before asking again for a point's horizon after
 * a failure that may pass (VENT-45): 2 s, 6 s, then 18 s, or the server's
 * Retry-After cut to 30 s, four tries in all. The wait is injected, so a
 * test runs it at once.
 */
import {
  TerrainNotInstalledError,
  TransientHorizonError,
} from './horizon-errors';
import type { SiteHorizon } from './horizon-store';
import type { KnownHorizon } from './point-horizon';

export interface RetryPolicy {
  /** The waits between tries, ms; one try more than waits. */
  readonly delaysMs: readonly number[];
  /** The longest wait a Retry-After may ask for, ms. */
  readonly maxWaitMs: number;
}

export const HORIZON_RETRY: RetryPolicy = {
  delaysMs: [2000, 6000, 18_000],
  maxWaitMs: 30_000,
};

/** Resolves after `ms`. */
export type Sleep = (ms: number) => Promise<void>;

/**
 * The wait before the next try after `failures` failed tries, ms; null
 * when `error` is final or the tries ran out.
 */
export function retryDelayMs(
  error: unknown,
  failures: number,
  policy: RetryPolicy,
): number | null {
  if (!(error instanceof TransientHorizonError)) return null;
  const planned = policy.delaysMs[failures];
  if (planned === undefined) return null;
  return Math.min(error.retryAfterMs ?? planned, policy.maxWaitMs);
}

/** What the tries left, and whether asking later may still help. */
export interface Asked {
  readonly horizon: SiteHorizon;
  readonly lapsed: boolean;
}

/** What a final `error` leaves. */
function settled(error: unknown): Asked {
  if (error instanceof TerrainNotInstalledError) {
    return { horizon: { kind: 'notInstalled' }, lapsed: false };
  }
  const lapsed = error instanceof TransientHorizonError;
  return { horizon: { kind: 'unavailable' }, lapsed };
}

/** Tries `once` until it answers, fails for good or the tries run out. */
export async function askWithRetry(
  once: () => Promise<KnownHorizon>,
  sleep: Sleep,
  policy: RetryPolicy = HORIZON_RETRY,
): Promise<Asked> {
  for (let failures = 0; ; failures++) {
    try {
      return { horizon: { kind: 'terrain', ...(await once()) }, lapsed: false };
    } catch (error) {
      const wait = retryDelayMs(error, failures, policy);
      if (wait === null) return settled(error);
      await sleep(wait);
    }
  }
}
