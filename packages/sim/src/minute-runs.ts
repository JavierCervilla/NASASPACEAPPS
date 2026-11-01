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
 * Splits a stretch of time into runs of whole minutes that share one state,
 * without computing every minute: the state is sampled every `stepMs`, and
 * each change is narrowed by bisection to the first whole minute that holds
 * the new state. A change that comes and goes inside one step is missed, so
 * the step must be shorter than the shortest run worth seeing.
 */

/** One minute, ms. */
export const MINUTE_MS = 60_000;

/** A run of minutes with one state: `startMs` included, `endMs` not. */
export interface Run<K> {
  readonly startMs: number;
  readonly endMs: number;
  readonly key: K;
}

/** Options of {@link minuteRuns}. */
export interface RunOptions<K> {
  /** The state at an instant, compared with `===`. */
  readonly keyAt: (ms: number) => K;
  /** Start of the stretch, rounded down to a whole minute. */
  readonly fromMs: number;
  /** End of the stretch, not included. */
  readonly toMs: number;
  /** How far apart the samples are, a whole number of minutes. */
  readonly stepMs: number;
}

/**
 * The first whole minute after `lo` (a minute index with state `key`) and
 * no later than `hi` whose state differs, by bisection.
 */
function firstChange<K>(
  keyAt: (ms: number) => K,
  key: K,
  lo: number,
  hi: number,
): number {
  let [low, high] = [lo, hi];
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (keyAt(mid * MINUTE_MS) === key) low = mid;
    else high = mid;
  }
  return high;
}

/**
 * The runs of `options.keyAt` from `fromMs` to `toMs`, in time order, each
 * boundary on a whole minute.
 */
export function minuteRuns<K>(options: RunOptions<K>): Run<K>[] {
  const { keyAt, stepMs } = options;
  const step = Math.max(1, Math.round(stepMs / MINUTE_MS));
  const end = Math.ceil(options.toMs / MINUTE_MS);
  let at = Math.floor(options.fromMs / MINUTE_MS);
  let start = at;
  let key = keyAt(at * MINUTE_MS);
  const runs: Run<K>[] = [];
  while (at < end) {
    // The last sample is the stretch's last minute, which it includes.
    const next = Math.min(at + step, end - 1);
    if (next <= at || keyAt(next * MINUTE_MS) === key) {
      at = Math.max(next, at + 1);
      continue;
    }
    at = firstChange(keyAt, key, at, next);
    runs.push({ startMs: start * MINUTE_MS, endMs: at * MINUTE_MS, key });
    [start, key] = [at, keyAt(at * MINUTE_MS)];
  }
  runs.push({ startMs: start * MINUTE_MS, endMs: end * MINUTE_MS, key });
  return runs;
}
