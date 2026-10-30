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
 * The limit on Horizons downloads (cache misses) per client IP, so one client
 * cannot fill the download queue or the cache.
 */
import { FixedWindowLimiter } from './fixed-window-limiter.ts';

/**
 * Cache misses one client IP may cause per window when the caller sets none.
 */
export const DEFAULT_MISSES_PER_WINDOW = 30;
/** Length of the miss-limit window when the caller sets none: 10 minutes. */
export const DEFAULT_MISS_WINDOW_MS = 10 * 60 * 1000;
// Keys the limiter keeps at most; past it the oldest key is dropped, so the map
// cannot grow without bound.
const DEFAULT_MAX_LIMITER_KEYS = 10_000;

/** A fixed-window counter of cache misses per key (the client IP). */
export interface MissLimiter {
  /**
   * Counts one miss for `key`: 0 when allowed, else the whole seconds until
   * the key's window ends.
   */
  take(key: string): number;
  /** Keys held in memory. */
  size(): number;
}

/** Settings of {@link createMissLimiter}. */
export interface MissLimiterOptions {
  readonly limit?: number;
  readonly windowMs?: number;
  readonly now?: () => number;
  readonly maxKeys?: number;
}

/**
 * An in-memory fixed-window limiter. Expired keys are pruned at most once per
 * window, and when the map is full the oldest key is dropped, so memory stays
 * bounded whatever the number of clients.
 */
export function createMissLimiter(
  options: MissLimiterOptions = {},
): MissLimiter {
  return new FixedWindowLimiter({
    limit: options.limit ?? DEFAULT_MISSES_PER_WINDOW,
    windowMs: options.windowMs ?? DEFAULT_MISS_WINDOW_MS,
    now: options.now ?? Date.now,
    maxKeys: options.maxKeys ?? DEFAULT_MAX_LIMITER_KEYS,
  });
}

/**
 * A client IP passed its cache-miss limit; `retryAfterSec` says when its window
 * ends.
 */
export class MissLimitError extends Error {
  override readonly name = 'MissLimitError';
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super('cache miss limit reached');
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * The `onMiss` hook that counts a miss for the key and refuses it with a
 * {@link MissLimitError} once the key is over its limit. `key` is called on
 * the first miss only, so a request served from the cache never works it out.
 */
export function limitMisses(
  limiter: MissLimiter,
  key: () => string,
): () => void {
  let resolved: string | undefined;
  return () => {
    resolved ??= key();
    const wait = limiter.take(resolved);
    if (wait > 0) throw new MissLimitError(wait);
  };
}
