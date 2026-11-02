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
 * Fetches one file of a LOLA tier into the terrain volume (VENT-43): into
 * `<name>.part`, continued with an HTTP Range request after a cut or a
 * restart, then checked against its pinned sha256 before the rename, so
 * the tier presence never sees half a file. A cut keeps the part and
 * retries with backoff; a hash that does not match deletes it and starts
 * again. Progress goes to the log once per file and at most every 30 s.
 */
import { join } from 'node:path';
import type { TierFile } from './catalogue.ts';
import type { FetchFs } from './fetch-fs.ts';

/** What the fetch needs from the outside, injected for the tests. */
export interface FetchDeps {
  readonly http: (
    url: string,
    init: { readonly headers: Record<string, string> },
  ) => Promise<Response>;
  readonly fs: FetchFs;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly log: (line: string) => void;
}

/** One file to fetch, and who hears of its bytes. */
export interface FileJob {
  readonly dir: string;
  readonly tierId: string;
  readonly file: TierFile;
  readonly onBytes: (done: number) => void;
}

/** Attempts per file in one run; a restart begins a new count. */
export const RETRIES = 12;
const BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
export const LOG_EVERY_MS = 30_000;

/** The wait before attempt `attempt + 1`: doubling, capped. */
export function backoffMs(attempt: number): number {
  return Math.min(BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

/** `body`, telling `tick` the bytes of the part after each chunk. */
async function* counted(
  body: AsyncIterable<Uint8Array>,
  start: number,
  tick: (done: number) => void,
): AsyncGenerator<Uint8Array> {
  let done = start;
  for await (const chunk of body) {
    yield chunk;
    done += chunk.byteLength;
    tick(done);
  }
}

/** Appends to `part` what it lacks of `job.file`. */
async function appendRest(deps: FetchDeps, job: FileJob, part: string) {
  const { file } = job;
  const have = Math.max(0, await deps.fs.size(part));
  if (have > file.bytes) await deps.fs.remove(part);
  if (have >= file.bytes) return;
  const label = `${job.tierId}/${file.file}`;
  deps.log(`terrain fetch: ${label}: from ${have} of ${file.bytes} bytes`);
  const res = await deps.http(file.url, {
    headers: { Range: `bytes=${have}-` },
  });
  const range = res.headers.get('content-range');
  const resumed = res.status === 206 && (range ?? '').includes(` ${have}-`);
  if (!(resumed || (res.status === 200 && have === 0)) || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }
  let last = deps.now();
  const tick = (done: number): void => {
    job.onBytes(done);
    if (deps.now() - last < LOG_EVERY_MS) return;
    last = deps.now();
    deps.log(`terrain fetch: ${label}: ${done} of ${file.bytes} bytes`);
  };
  const body = res.body as unknown as AsyncIterable<Uint8Array>;
  await deps.fs.append(part, counted(body, have, tick));
}

/** Checks a whole part against its pin and puts it in place. */
async function settle(deps: FetchDeps, job: FileJob, part: string) {
  const { file } = job;
  const size = await deps.fs.size(part);
  if (size !== file.bytes) throw new Error(`cut at ${size} bytes`);
  const sha = await deps.fs.sha256(part);
  if (file.sha256 !== null && sha !== file.sha256) {
    await deps.fs.remove(part);
    throw new Error('sha256 does not match the pin; part deleted');
  }
  await deps.fs.rename(part, join(job.dir, file.file));
  const pin = file.sha256 === null ? 'not pinned yet' : 'ok';
  deps.log(`terrain fetch: ${job.tierId}/${file.file}: sha256 ${sha} ${pin}`);
}

/** Fetches `job.file` unless it is complete; throws after RETRIES. */
export async function fetchFile(deps: FetchDeps, job: FileJob) {
  const path = join(job.dir, job.file.file);
  if ((await deps.fs.size(path)) === job.file.bytes) return;
  const part = `${path}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      await appendRest(deps, job, part);
      await settle(deps, job, part);
      return;
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      const why = (error as Error).message;
      const name = `${job.tierId}/${job.file.file}`;
      deps.log(`terrain fetch: ${name}: ${why}; retry ${attempt}`);
      await deps.sleep(backoffMs(attempt));
    }
  }
}
