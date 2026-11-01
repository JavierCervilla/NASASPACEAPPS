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
 * Reads one block of a tier from its files on disk (VENT-40): a line at a
 * time, each a positioned read of the block's width, so no more than the
 * block is ever in memory. The files stay open once used.
 */
import { open, type FileHandle } from 'node:fs/promises';
import { endianness } from 'node:os';
import { join } from 'node:path';
import { BLOCK_SIZE, type Block } from './block-cache.ts';
import type { Tier, TierFile } from './catalogue.ts';
import { blockOrigin, blockWidth } from './tier-grid.ts';

/** Reads blocks from the tiers' files under one directory. */
export class BlockReader {
  private readonly handles = new Map<string, Promise<FileHandle>>();
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    // The grids are little-endian; an Int16Array reads the host's order.
    if (endianness() !== 'LE') throw new Error('terrain: big-endian host');
  }

  private handle(file: TierFile): Promise<FileHandle> {
    let handle = this.handles.get(file.file);
    if (!handle) {
      handle = open(join(this.dir, file.file), 'r');
      this.handles.set(file.file, handle);
    }
    return handle;
  }

  /** The block `key` of `tier` (a block never spans two tiles). */
  async read(tier: Tier, key: number): Promise<Block> {
    const [line0, sample0] = blockOrigin(key);
    const width = blockWidth(tier, sample0);
    const height = Math.min(BLOCK_SIZE, tier.lines - line0);
    const row = Math.floor(line0 / tier.tileLines);
    const col = Math.floor(sample0 / tier.tileSamples);
    const file = tier.files.find((f) => f.row === row && f.col === col);
    if (!file) throw new Error(`terrain: ${tier.id} has no tile ${row},${col}`);
    const fh = await this.handle(file);
    const block = new Int16Array(width * height);
    const bytes = new Uint8Array(block.buffer);
    const tileLine = line0 - row * tier.tileLines;
    const tileSample = sample0 - col * tier.tileSamples;
    for (let i = 0; i < height; i++) {
      const at = ((tileLine + i) * tier.tileSamples + tileSample) * 2;
      await fh.read(bytes, i * width * 2, width * 2, at);
    }
    return block;
  }

  /** Closes every open file. */
  async close(): Promise<void> {
    const handles = [...this.handles.values()];
    this.handles.clear();
    await Promise.all(handles.map(async (h) => (await h).close()));
  }
}
