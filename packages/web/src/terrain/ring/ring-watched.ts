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
 * One GET of the ring watched for silence (VENT-78): a request that gets
 * nothing for STALL_MS, no headers or no next bytes of its body, is
 * aborted and counts as a failure that may pass, so it is asked again at
 * once instead of holding a tile until the browser gives up (a phone on a
 * dead connection: minutes). The silence, not the whole time, is bounded,
 * so a slow network that keeps sending is never cut off.
 */
import { TransientHorizonError } from '../../horizon/horizon-errors';
import {
  STALL_MS, realTimer, watchSilence, type Timer, type Watch,
} from './ring-silence';

export type { Timer } from './ring-silence';

/** The chunks of a body as one array of bytes. */
function joined(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes;
}

/**
 * The body as bytes (JSON or a binary tile, VENT-98), read chunk by chunk
 * under `watch`.
 */
async function bodyBytes(response: Response, watch: Watch) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());
  const cancel = (): void => void reader.cancel().catch(() => undefined);
  watch.signal.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (watch.signal.aborted) throw watch.signal.reason;
    if (done) return joined(chunks, length);
    watch.poke();
    chunks.push(value);
    length += value.length;
  }
}

/** What one watched GET gave: the response, and its body when it is ok. */
export interface Watched {
  readonly response: Response;
  readonly bytes: Uint8Array | null;
}

/**
 * GETs `url` with `fetcher`; a silence of STALL_MS throws a
 * TransientHorizonError, an abort of `signal` throws as fetch does.
 */
export async function fetchWatched(
  fetcher: typeof fetch,
  url: string,
  signal: AbortSignal,
  timer: Timer = realTimer,
): Promise<Watched> {
  const watch = watchSilence(signal, timer);
  watch.poke();
  try {
    const response = await fetcher(url, { signal: watch.signal });
    watch.poke();
    const bytes = response.ok ? await bodyBytes(response, watch) : null;
    return { response, bytes };
  } catch (error) {
    if (!watch.stalled()) throw error;
    throw new TransientHorizonError(null, `ring: silent for ${STALL_MS} ms`);
  } finally {
    watch.stop();
  }
}
