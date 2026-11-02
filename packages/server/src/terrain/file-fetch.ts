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
 * retries with backoff; a hash that does not match, or a part larger than
 * the file, deletes it and starts again. What an answer may write is in
 * `part-writer.ts`. Progress goes to the log once per file and at most
 * every 30 s.
 */
import { join } from 'node:path';
import type { TierFile } from './catalogue.ts';
import type { FetchFs } from './fetch-fs.ts';
import { progressTick } from './fetch-progress.ts';
import { discard, writeAnswer } from './part-writer.ts';

/** What the fetch needs from the outside, injected for the tests. */
export interface FetchDeps {
  readonly http: (
    url: string,
    init: {
      readonly headers: Record<string, string>;
      readonly signal?: AbortSignal;
    },
  ) => Promise<Response>;
  readonly fs: FetchFs;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly log: (line: string) => void;
  /** Aborted on shutdown: the fetch stops at once and keeps its part. */
  readonly signal?: AbortSignal;
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
export { LOG_EVERY_MS } from './fetch-progress.ts';

/** The wait before attempt `attempt + 1`: doubling, capped. */
export function backoffMs(attempt: number): number {
  return Math.min(BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

/** The bytes of the part; one larger than the file is deleted first. */
async function partBytes(deps: FetchDeps, job: FileJob, part: string) {
  const have = Math.max(0, await deps.fs.size(part));
  const { bytes, file } = job.file;
  if (have <= bytes) return have;
  deps.log(
    `terrain fetch: ${job.tierId}/${file}: part of ${have} bytes is ` +
      `larger than the file (${bytes}); deleted, starting again`,
  );
  await deps.fs.remove(part);
  return 0;
}

/** Appends to `part` what it lacks of `job.file`. */
async function appendRest(deps: FetchDeps, job: FileJob, part: string) {
  const { file } = job;
  const have = await partBytes(deps, job, part);
  if (have === file.bytes) return;
  const label = `${job.tierId}/${file.file}`;
  deps.log(`terrain fetch: ${label}: from ${have} of ${file.bytes} bytes`);
  const request = new AbortController();
  const outer = deps.signal;
  const signal = outer
    ? AbortSignal.any([outer, request.signal])
    : request.signal;
  const headers = { Range: `bytes=${have}-` };
  const res = await deps.http(file.url, { headers, signal });
  try {
    const tick = progressTick(deps, job);
    await writeAnswer(deps, { job, part, have, res }, tick);
  } catch (error) {
    request.abort();
    discard(res);
    throw error;
  }
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

/**
 * Fetches `job.file` unless it is complete; throws after RETRIES, and at
 * once when `deps.signal` is aborted (the part stays for the next run).
 */
export async function fetchFile(deps: FetchDeps, job: FileJob) {
  const path = join(job.dir, job.file.file);
  if ((await deps.fs.size(path)) === job.file.bytes) return;
  const part = `${path}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      deps.signal?.throwIfAborted();
      await appendRest(deps, job, part);
      await settle(deps, job, part);
      return;
    } catch (error) {
      if (deps.signal?.aborted || attempt >= RETRIES) throw error;
      const why = (error as Error).message;
      const name = `${job.tierId}/${job.file.file}`;
      deps.log(`terrain fetch: ${name}: ${why}; retry ${attempt}`);
      await deps.sleep(backoffMs(attempt));
    }
  }
}
