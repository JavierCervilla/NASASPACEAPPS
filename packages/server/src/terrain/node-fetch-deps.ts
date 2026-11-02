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
 * The terrain fetch's outside world in the running server (VENT-43): the
 * global fetch, the disk, the clock and timers that never keep the process
 * alive on their own (a backoff can be cut short by the shutdown signal),
 * and the log on stdout.
 */
import { setTimeout as wait } from 'node:timers/promises';
import { NodeFetchFs } from './node-fetch-fs.ts';
import type { LockDeps } from './fetch-lock.ts';

/** Runs `fn` every `ms` without holding the process open. */
function every(ms: number, fn: () => void): () => void {
  const timer = setInterval(fn, ms);
  timer.unref();
  return () => clearInterval(timer);
}

/** One line on stdout. */
function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

/**
 * {@link LockDeps} over Node; `signal` stops the fetch, and cuts short a
 * backoff or a wait for the lock.
 */
export function nodeFetchDeps(signal?: AbortSignal): LockDeps {
  const fs = new NodeFetchFs();
  const sleep = (ms: number): Promise<void> => wait(ms, undefined, { signal });
  const deps = { http: fetch, fs, now: Date.now, sleep, log, every };
  return signal ? { ...deps, signal } : deps;
}
