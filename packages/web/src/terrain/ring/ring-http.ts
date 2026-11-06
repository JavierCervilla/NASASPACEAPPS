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
 * The requests of the ring (VENT-46): one GET, JSON or a binary tile by
 * its Content-Type (VENT-98), with the horizon's
 * classification of failures (VENT-45, horizon-errors.ts), watched for
 * silence (ring-watched.ts) and tried again on the tiles' own short waits
 * (VENT-78), and a queue that runs the jobs a few at a time.
 */
import { TransientHorizonError, failureOf }
  from '../../horizon/horizon-errors';
import {
  retryDelayMs, type Random, type RetryPolicy, type Sleep,
} from '../../horizon/horizon-retry';
import { decodeTileBinary } from '@ventana/sim';
import { fetchWatched, type Timer } from './ring-watched';

const BINARY_TYPE = 'application/octet-stream';

export interface Waits {
  readonly sleep: Sleep;
  readonly random: Random;
  /** The silence watch's timer; the real one when unset. */
  readonly timer?: Timer;
}

/**
 * A tile's tries (VENT-78): the horizon's 2, 6 and 18 s held a tile 10 to
 * 15 s on a phone, while the parent level stands in for it meanwhile; so
 * short waits, a long Retry-After (the address over its limit) waited
 * only up to 8 s, and once the tries run out the tile stays a hole.
 */
export const TILE_RETRY: RetryPolicy = {
  delaysMs: [500, 1000, 2000, 4000],
  maxWaitMs: 8000,
};

/** The body of an ok answer as JSON. */
function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new TransientHorizonError(null, 'ring: not JSON');
  }
}

/**
 * The body of an ok answer by its Content-Type (VENT-98): a binary tile
 * decoded, anything else as JSON. A body that is neither is a failure that
 * may pass.
 */
function answerOf(response: Response, bytes: Uint8Array | null): unknown {
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith(BINARY_TYPE)) {
    return parsed(new TextDecoder().decode(bytes ?? new Uint8Array(0)));
  }
  try {
    return decodeTileBinary(bytes ?? new Uint8Array(0));
  } catch {
    throw new TransientHorizonError(null, 'ring: not a binary tile');
  }
}

/**
 * GET `url`, its body by its Content-Type (JSON, or a binary tile as
 * `BinaryTile`), its failures classified, on {@link TILE_RETRY}.
 */
export async function getAnswer(
  fetcher: typeof fetch,
  url: string,
  waits: Waits,
  signal: AbortSignal,
): Promise<unknown> {
  for (let failures = 0; ; failures++) {
    try {
      const { response, bytes } = await fetchWatched(
        fetcher, url, signal, waits.timer,
      ).catch((e: unknown) => {
        if (signal.aborted || e instanceof TransientHorizonError) throw e;
        throw new TransientHorizonError(null, `ring: ${String(e)}`);
      });
      if (!response.ok) throw await failureOf(response);
      return answerOf(response, bytes);
    } catch (error) {
      const wait = retryDelayMs(error, failures, TILE_RETRY, waits.random);
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

