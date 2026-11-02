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
 * The disk as the terrain fetch sees it (VENT-43): the few file
 * operations it needs, behind an interface so the scheduler is tested
 * over memory. `NodeFetchFs` (`node-fetch-fs.ts`) is the real one.
 */
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { rename, rm, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface FetchFs {
  /** The size of `path` in bytes, or -1 when it does not exist. */
  size(path: string): Promise<number>;
  /** Appends every chunk of `body` to `path`, creating it. */
  append(path: string, body: AsyncIterable<Uint8Array>): Promise<void>;
  sha256(path: string): Promise<string>;
  rename(from: string, to: string): Promise<void>;
  /** Removes `path`; nothing when it does not exist. */
  remove(path: string): Promise<void>;
  /** Bytes an unprivileged process may still write under `dir`. */
  freeBytes(dir: string): Promise<number>;
  /** Creates `dir` if needed; false when it cannot be written. */
  writable(dir: string): Promise<boolean>;
  /** Creates `path` only if it does not exist; false when it does. */
  createExclusive(path: string, text: string): Promise<boolean>;
  /** The text of `path`; null when it does not exist. */
  read(path: string): Promise<string | null>;
  /** Moves `from` to `to` only if `to` does not exist; false when it does. */
  moveExclusive(from: string, to: string): Promise<boolean>;
  /** When `path` was last touched, ms; null when it does not exist. */
  mtimeMs(path: string): Promise<number | null>;
  touch(path: string, atMs: number): Promise<void>;
}

/** The file half of {@link FetchFs} over `node:fs`. */
export class NodeFileOps {
  size(path: string): Promise<number> {
    return stat(path).then(
      (s) => s.size,
      () => -1,
    );
  }

  async append(path: string, body: AsyncIterable<Uint8Array>) {
    const out = createWriteStream(path, { flags: 'a' });
    await pipeline(Readable.from(body), out);
  }

  async sha256(path: string): Promise<string> {
    const hash = createHash('sha256');
    const chunks = createReadStream(path, { highWaterMark: 1 << 20 });
    await pipeline(chunks, hash);
    return hash.digest('hex');
  }

  rename(from: string, to: string): Promise<void> {
    return rename(from, to);
  }

  remove(path: string): Promise<void> {
    return rm(path, { force: true });
  }
}
