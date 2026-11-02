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
 * The progress of one file's fetch (VENT-43): every chunk goes to the
 * status, and to the log at most every 30 s, never with its URL.
 */
import type { FetchDeps, FileJob } from './file-fetch.ts';

export const LOG_EVERY_MS = 30_000;

/** What hears of the part's bytes after each chunk of `job`'s file. */
export function progressTick(
  deps: FetchDeps,
  job: FileJob,
): (done: number) => void {
  const label = `${job.tierId}/${job.file.file}`;
  let last = deps.now();
  return (done) => {
    job.onBytes(done);
    if (deps.now() - last < LOG_EVERY_MS) return;
    last = deps.now();
    deps.log(`terrain fetch: ${label}: ${done} of ${job.file.bytes} bytes`);
  };
}
