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
 * The decoded tiles of a ring, by key (VENT-46): what the source delivers
 * and the scene reads. A tile is its key, `n` x `n` heights in metres over
 * the sphere (NaN where no data) and the resolution that served it: plain
 * numbers, so a Web Worker streamer can hand them over as transferables
 * (VENT-47). Nodes are read by lattice position (ring-nodes.ts). Pure.
 */
import type { TileKey, TileScheme } from '@ventana/sim';
import { nameOf, tileAt } from './ring-cells';

export interface RingTile {
  readonly key: TileKey;
  readonly n: number;
  /** Rows from north, columns from west; metres over the sphere. */
  readonly heights: Float32Array;
  /** The finest LOLA grid that served any node, metres. */
  readonly resolutionM: number;
}

type Listener = (tile: RingTile) => void;

/** The tiles a session holds, and who wants to hear of a new one. */
export class RingStore {
  readonly tiles = new Map<string, RingTile>();
  /** Every wanted tile has come or failed for good: the ring is whole. */
  complete = false;
  private readonly listeners = new Set<Listener>();
  readonly onDone = new Set<() => void>();

  constructor(readonly scheme: TileScheme) {}

  add(tile: RingTile): void {
    this.tiles.set(nameOf(tile.key), tile);
    for (const listen of this.listeners) listen(tile);
  }

  get(level: number, x: number, y: number): RingTile | undefined {
    return this.tiles.get(nameOf(tileAt(this.scheme, level, x, y)));
  }

  /** Calls `listen` for every new tile; returns the unsubscribe. */
  subscribe(listen: Listener): () => void {
    this.listeners.add(listen);
    return () => this.listeners.delete(listen);
  }

  /** Calls `done` when the ring is whole (at once if it already is). */
  whenComplete(done: () => void): void {
    if (this.complete) done();
    else this.onDone.add(done);
  }
}
