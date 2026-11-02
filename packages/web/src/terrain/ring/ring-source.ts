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
 * Where the view's relief comes from (VENT-46): a {@link RingSource}, the
 * seam the streaming worker plugs into (VENT-47). It is told the point and
 * the levels, and feeds the tiles it decodes to a {@link RingFeed} as they
 * come, nearest and finest first; the session's frame and windows decide
 * which of the route's tiles are wanted. Tiles are plain numbers a Web
 * Worker can hand over as transferables.
 */
import type { TileScheme } from '@ventana/sim';
import type { LatLon } from '../../lib/polar-projection';
import type { RingEntry } from './ring-answer';
import type { RingTile } from './ring-store';

export interface RingRequest {
  readonly point: LatLon;
  /** Levels asked for, from the finest: 1 to 4. */
  readonly levels: number;
  /** Which of the route's tiles the view wants, once it knows the scheme. */
  readonly wanted: (scheme: TileScheme, entries: readonly RingEntry[]) =>
    readonly RingEntry[];
}

export interface RingFeed {
  /** The scheme the tiles are on: before the first tile. */
  readonly scheme: (scheme: TileScheme) => void;
  readonly tile: (tile: RingTile) => void;
  /** Every wanted tile of `level` has come or failed for good. */
  readonly settled: (level: number) => void;
}

export interface RingSource {
  /**
   * Feeds the ring; resolves when every wanted tile came or failed. A
   * tile that fails for good is a hole (the parent level fills it), never a
   * rejection; the route's failures reject as horizon-errors.ts.
   */
  readonly load: (
    request: RingRequest,
    feed: RingFeed,
    signal: AbortSignal,
  ) => Promise<void>;
}
