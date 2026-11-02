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
 * One fetch per terrain volume (VENT-43): during a rolling deploy two
 * servers may share it, and two writers on one `.part` would corrupt it.
 * The holder keeps the lock file's time fresh; a lock left by a process
 * that died goes stale and is taken over.
 */
import { join } from 'node:path';
import type { FetchDeps } from './file-fetch.ts';

export const LOCK_FILE = '.fetch.lock';
export const HEARTBEAT_MS = 30_000;
/** A lock not touched for this long belongs to no one. */
export const STALE_MS = 2 * 60_000;

export interface LockDeps extends FetchDeps {
  /** Runs `fn` every `ms`; returns what stops it. */
  readonly every: (ms: number, fn: () => void) => () => void;
}

/** Takes the lock at `path`; false while a live holder has it. */
async function tryLock(deps: LockDeps, path: string): Promise<boolean> {
  const stamp = String(deps.now());
  if (await deps.fs.createExclusive(path, stamp)) return true;
  const touched = await deps.fs.mtimeMs(path);
  if (touched !== null && deps.now() - touched < STALE_MS) return false;
  await deps.fs.remove(path);
  return deps.fs.createExclusive(path, stamp);
}

/**
 * Waits until the lock of `dir` is free and takes it; resolves to what
 * releases it. `onWait` runs once if it has to wait.
 */
export async function acquireLock(
  deps: LockDeps,
  dir: string,
  onWait: () => void,
): Promise<() => Promise<void>> {
  const path = join(dir, LOCK_FILE);
  let waited = false;
  while (!(await tryLock(deps, path))) {
    if (!waited) onWait();
    waited = true;
    await deps.sleep(HEARTBEAT_MS);
  }
  const beat = (): void => {
    deps.fs.touch(path, deps.now()).catch(() => undefined);
  };
  const stop = deps.every(HEARTBEAT_MS, beat);
  return async () => {
    stop();
    await deps.fs.remove(path);
  };
}
