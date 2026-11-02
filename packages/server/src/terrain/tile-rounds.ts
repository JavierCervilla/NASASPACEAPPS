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
 * One height tile read in rounds (VENT-34), as `horizon-rounds.ts` reads a
 * horizon: the core is synchronous and pure, the disk is not, so a probe
 * notes the blocks the tile's samples fall in (a missing block reads as
 * 0 m, so each sample stays on the finest grid that covers it), then real
 * rounds run until no block is missing.
 */
import type { BlockLoader } from './block-loader.ts';
import type { Tier } from './catalogue.ts';
import {
  tileAnswer,
  tileOf,
  type TileAnswer,
  type TilePoint,
} from './tile-answer.ts';
import type { TerrainService } from './terrain-service.ts';
import { inRounds } from './rounds.ts';
import { TierGrid } from './tier-grid.ts';

/** What a read needs: the shared blocks and the tiers present. */
export interface TileRead {
  readonly blocks: BlockLoader;
  readonly present: readonly Tier[];
}

/** The tile at `point` from the tiers of `read`. */
export async function readTile(
  read: TileRead,
  point: TilePoint,
): Promise<TileAnswer> {
  const finest = [...read.present].sort(
    (a, b) => a.resolutionM - b.resolutionM,
  );
  const grids = finest.map((t) => new TierGrid(t));
  const demGrids = grids.map((g) => g.grid);
  const compute = () => tileOf(demGrids, point);
  const tile = await inRounds(read.blocks, grids, compute);
  return tileAnswer(point, tile, read.present);
}

/**
 * The tile at `point`, in turn with the horizons (one gate), from
 * `present` (the caller's view of the tiers, so a cache key names the
 * tiers that answered) or the tiers present now.
 */
export function tileIn(
  service: TerrainService,
  point: TilePoint,
  present: readonly Tier[] = service.present,
): Promise<TileAnswer> {
  const { blocks } = service;
  return service.gate.run(() => readTile({ blocks, present }, point));
}
