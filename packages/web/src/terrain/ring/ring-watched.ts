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

/** The body as text, read chunk by chunk under `watch`. */
async function bodyText(response: Response, watch: Watch): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const cancel = (): void => void reader.cancel().catch(() => undefined);
  watch.signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (watch.signal.aborted) throw watch.signal.reason;
    if (done) return text + decoder.decode();
    watch.poke();
    text += decoder.decode(value, { stream: true });
  }
}

/** What one watched GET gave: the response, and its body when it is ok. */
export interface Watched {
  readonly response: Response;
  readonly text: string | null;
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
    const text = response.ok ? await bodyText(response, watch) : null;
    return { response, text };
  } catch (error) {
    if (!watch.stalled()) throw error;
    throw new TransientHorizonError(null, `ring: silent for ${STALL_MS} ms`);
  } finally {
    watch.stop();
  }
}
