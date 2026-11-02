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
 * Retry-After when longer, each spread by a factor from 0.5 to 1.5 so the
 * pages that lost the server together do not come back together; never
 * under the Retry-After, never over 30 s; four tries in all. The wait and
 * the random source are injected, so a test runs it at once and exactly.
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

/** A number from 0 (included) to 1, as `Math.random`. */
export type Random = () => number;

/**
 * The wait before the next try after `failures` failed tries, ms, spread
 * by `random`; null when `error` is final or the tries ran out. A
 * Retry-After shorter than the planned wait (0 included) does not
 * shorten it: the server's own retries hold the same floor.
 */
export function retryDelayMs(
  error: unknown,
  failures: number,
  policy: RetryPolicy,
  random: Random,
): number | null {
  if (!(error instanceof TransientHorizonError)) return null;
  const planned = policy.delaysMs[failures];
  if (planned === undefined) return null;
  const asked = error.retryAfterMs ?? 0;
  const spread = Math.max(planned, asked) * (0.5 + random());
  return Math.min(Math.max(spread, asked), policy.maxWaitMs);
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

/** How {@link askWithRetry} waits between tries. */
export interface Waits {
  readonly sleep: Sleep;
  readonly random: Random;
}

/** Tries `once` until it answers, fails for good or the tries run out. */
export async function askWithRetry(
  once: () => Promise<KnownHorizon>,
  { sleep, random }: Waits,
  policy: RetryPolicy = HORIZON_RETRY,
): Promise<Asked> {
  for (let failures = 0; ; failures++) {
    try {
      return { horizon: { kind: 'terrain', ...(await once()) }, lapsed: false };
    } catch (error) {
      const wait = retryDelayMs(error, failures, policy, random);
      if (wait === null) return settled(error);
      await sleep(wait);
    }
  }
}
