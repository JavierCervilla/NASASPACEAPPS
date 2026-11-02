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
 * {@link FetchFs} over `node:fs` (VENT-43): the file half from
 * {@link NodeFileOps}, and here the volume half: its free room, whether it
 * can be written, and the lock file.
 */
import { constants } from 'node:fs';
import {
  access,
  mkdir,
  open,
  stat,
  statfs,
  utimes,
} from 'node:fs/promises';
import { NodeFileOps, type FetchFs } from './fetch-fs.ts';

/** {@link FetchFs} over `node:fs`. */
export class NodeFetchFs extends NodeFileOps implements FetchFs {
  async freeBytes(dir: string): Promise<number> {
    const fs = await statfs(dir);
    return fs.bavail * fs.bsize;
  }

  async writable(dir: string): Promise<boolean> {
    try {
      await mkdir(dir, { recursive: true });
      await access(dir, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

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
