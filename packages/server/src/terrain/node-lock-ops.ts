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
 * The lock-file half of {@link FetchFs} over `node:fs` (VENT-43): created
 * only when absent, read for its token, moved aside without overwriting,
 * and its time read and touched by the heartbeat.
 */
import { link, open, readFile, rm, stat, utimes } from 'node:fs/promises';
import { NodeFileOps } from './fetch-fs.ts';

/** {@link NodeFileOps} and the lock file's operations. */
export class NodeLockOps extends NodeFileOps {
  async createExclusive(path: string, text: string): Promise<boolean> {
    try {
      const file = await open(path, 'wx');
      await file.writeFile(text);
      await file.close();
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw error;
    }
  }

  read(path: string): Promise<string | null> {
    return readFile(path, 'utf8').catch(() => null);
  }

  /** A hard link, then the old name gone: never over an existing file. */
  async moveExclusive(from: string, to: string): Promise<boolean> {
    try {
      await link(from, to);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw error;
    }
    await rm(from, { force: true });
    return true;
  }

  mtimeMs(path: string): Promise<number | null> {
    return stat(path).then(
      (s) => s.mtimeMs,
      () => null,
    );
  }

  touch(path: string, atMs: number): Promise<void> {
    const at = new Date(atMs);
    return utimes(path, at, at);
  }
}
