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
 * The lock file holds its holder's token, and the holder keeps its time
 * fresh; a lock left by a process that died goes stale and is taken over.
 * The takeover moves the stale lock to a name only the taker uses, so of
 * two takers only one wins the rename; one that finds it moved a live lock
 * (taken between its check and its move) puts it back and waits.
 */
import { randomUUID } from 'node:crypto';
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

/** Whether `path` exists and was last touched STALE_MS ago or more. */
async function isStale(deps: LockDeps, path: string): Promise<boolean> {
  const touched = await deps.fs.mtimeMs(path);
  return touched !== null && deps.now() - touched >= STALE_MS;
}

/** Takes over the stale lock at `path` for `token`; false when it lost. */
async function takeStale(deps: LockDeps, path: string, token: string) {
  if (!(await isStale(deps, path))) return false;
  const tomb = `${path}.${token}.stale`;
  const moved = await deps.fs.rename(path, tomb).then(
    () => true,
    () => false,
  );
  if (!moved) return false;
  if (!(await isStale(deps, tomb))) {
    await deps.fs.moveExclusive(tomb, path);
    await deps.fs.remove(tomb);
    return false;
  }
  await deps.fs.remove(tomb);
  return deps.fs.createExclusive(path, token);
}

/** Takes the lock at `path`; false while a live holder has it. */
async function tryLock(deps: LockDeps, path: string, token: string) {
  if (await deps.fs.createExclusive(path, token)) return true;
  return takeStale(deps, path, token);
}

/**
 * Keeps the lock at `path` fresh while it holds `token`; resolves to what
 * stops the heartbeat and deletes the lock, if it is still ours.
 */
function hold(deps: LockDeps, path: string, token: string) {
  const ours = async (): Promise<boolean> =>
    (await deps.fs.read(path)) === token;
  const beat = (): void => {
    const touch = async (mine: boolean): Promise<void> => {
      if (mine) await deps.fs.touch(path, deps.now());
    };
    ours().then(touch).catch(() => undefined);
  };
  const stop = deps.every(HEARTBEAT_MS, beat);
  return async (): Promise<void> => {
    stop();
    if (await ours()) await deps.fs.remove(path);
  };
}

/**
 * Waits until the lock of `dir` is free and takes it; resolves to what
 * releases it. `onWait` runs once if it has to wait. The heartbeat and
 * the release touch only a lock that still holds our token.
 */
export async function acquireLock(
  deps: LockDeps,
  dir: string,
  onWait: () => void,
): Promise<() => Promise<void>> {
  const path = join(dir, LOCK_FILE);
  const token = randomUUID();
  let waited = false;
  while (!(await tryLock(deps, path, token))) {
    if (!waited) onWait();
    waited = true;
    await deps.sleep(HEARTBEAT_MS);
  }
  return hold(deps, path, token);
}
