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
 * Blocks of elevation grids kept in memory between requests (VENT-40),
 * least recently used dropped first once their bytes pass a cap. The
 * terrain costs disk, not memory: only the blocks the rays crossed are
 * ever read, and at most `capBytes` of them stay after a request.
 */

/** A square of a grid's DNs, BLOCK_SIZE x BLOCK_SIZE or less at an edge. */
export type Block = Int16Array;

/** Side of a block, pixels: 256 x 256 x 2 bytes = 128 KiB. */
export const BLOCK_SIZE = 256;

export class BlockCache {
  private readonly blocks = new Map<string, Block>();
  private bytes = 0;
  private readonly capBytes: number;

  constructor(capBytes: number) {
    this.capBytes = capBytes;
  }

  /** The block under `key`, now the most recently used; or undefined. */
  get(key: string): Block | undefined {
    const block = this.blocks.get(key);
    if (block === undefined) return undefined;
    this.blocks.delete(key);
    this.blocks.set(key, block);
    return block;
  }

  /** Keeps `block`, dropping the least recently used past the cap. */
  set(key: string, block: Block): void {
    const old = this.blocks.get(key);
    if (old) this.bytes -= old.byteLength;
    this.blocks.delete(key);
    this.blocks.set(key, block);
    this.bytes += block.byteLength;
    for (const [k, b] of this.blocks) {
      if (this.bytes <= this.capBytes) break;
      this.blocks.delete(k);
      this.bytes -= b.byteLength;
    }
  }

  /** Bytes held. */
  size(): number {
    return this.bytes;
  }
}
