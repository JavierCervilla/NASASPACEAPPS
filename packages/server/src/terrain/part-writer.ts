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
 * Writes one answer of a LOLA server into a file's `.part` (VENT-43). A
 * 206 must start where the part ends; a 200 is the whole file (a server
 * that ignored the Range), so the part starts again from 0. Anything else
 * is refused with its body let go. The bytes never go past the file's
 * size: a server that sends more loses the request and the part.
 */
import type { FetchDeps, FileJob } from './file-fetch.ts';

/** One answer and the part it goes into. */
export interface PartAnswer {
  readonly job: FileJob;
  readonly part: string;
  /** Bytes of the part before the request. */
  readonly have: number;
  readonly res: Response;
}

/** The first byte of `bytes a-b/n` for a file of `total`; else null. */
function contentRangeStart(header: string | null, total: number) {
  const m = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec((header ?? '').trim());
  if (!m || (m[3] !== '*' && Number(m[3]) !== total)) return null;
  return Number(m[1]);
}

/** Lets go of a body that will not be read; nothing if it is in use. */
export function discard(res: Response): void {
  res.body?.cancel().catch(() => undefined);
}

/** Where `res` writes in the part; throws when it cannot be used. */
function startOf(res: Response, have: number, total: number): number {
  if (res.status === 200) return 0;
  const range = res.headers.get('content-range');
  const start = contentRangeStart(range, total);
  if (res.status === 206 && start === have) return have;
  if (res.status !== 206) throw new Error(`HTTP ${res.status}`);
  throw new Error(`Content-Range ${range} does not start at ${have}`);
}

/**
 * `body` counted from `start`, telling `tick` the bytes so far; throws
 * before a chunk that would take the part past `limit`.
 */
async function* capped(
  body: AsyncIterable<Uint8Array>,
  span: { readonly start: number; readonly limit: number },
  tick: (done: number) => void,
): AsyncGenerator<Uint8Array> {
  let done = span.start;
  for await (const chunk of body) {
    done += chunk.byteLength;
    if (done > span.limit) {
      throw new RangeError(
        `${done} bytes, more than the ${span.limit} bytes of the file`,
      );
    }
    yield chunk;
    tick(done);
  }
}

/** Appends the body of `a.res` to the part, from where it starts. */
export async function writeAnswer(
  deps: FetchDeps,
  a: PartAnswer,
  tick: (done: number) => void,
): Promise<void> {
  const { job, part, res } = a;
  const label = `${job.tierId}/${job.file.file}`;
  if (res.status === 416) await deps.fs.remove(part);
  const start = startOf(res, a.have, job.file.bytes);
  if (start < a.have) {
    deps.log(`terrain fetch: ${label}: the server ignored the Range; from 0`);
    await deps.fs.remove(part);
  }
  if (!res.body) throw new Error(`HTTP ${res.status} without a body`);
  const body = res.body as unknown as AsyncIterable<Uint8Array>;
  const span = { start, limit: job.file.bytes };
  try {
    await deps.fs.append(part, capped(body, span, tick));
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    await deps.fs.remove(part);
    throw new Error(`${error.message}; part deleted`);
  }
}
