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
 * The requests of the ring (VENT-46): one GET as JSON with the horizon's
 * classification of failures and tries (VENT-45, horizon-errors.ts and
 * horizon-retry.ts), and a queue that runs the jobs a few at a time.
 */
import { TransientHorizonError, failureOf }
  from '../../horizon/horizon-errors';
import { HORIZON_RETRY, retryDelayMs, type Random, type Sleep }
  from '../../horizon/horizon-retry';

export interface Waits {
  readonly sleep: Sleep;
  readonly random: Random;
}

/** GET `url` as JSON, its failures classified; `tries` as the horizon's. */
export async function getJson(
  fetcher: typeof fetch,
  url: string,
  waits: Waits,
  signal: AbortSignal,
): Promise<unknown> {
  for (let failures = 0; ; failures++) {
    try {
      const response = await fetcher(url, { signal }).catch((e: unknown) => {
        if (signal.aborted) throw e;
        throw new TransientHorizonError(null, `ring: ${String(e)}`);
      });
      if (!response.ok) throw await failureOf(response);
      return await response.json().catch(() => {
        throw new TransientHorizonError(null, 'ring: not JSON');
      });
    } catch (error) {
      const wait = retryDelayMs(error, failures, HORIZON_RETRY, waits.random);
      if (wait === null || signal.aborted) throw error;
      await waits.sleep(wait);
    }
  }
}

/** Runs `jobs` in order, `limit` at a time. */
export async function inFlight(jobs: (() => Promise<void>)[], limit: number) {
  const queue = [...jobs];
  const worker = async (): Promise<void> => {
    for (let job = queue.shift(); job; job = queue.shift()) await job();
  };
  await Promise.all(Array.from({ length: limit }, worker));
}

