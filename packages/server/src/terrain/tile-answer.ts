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
 * From the tiers present and a height tile to the tile route's answer
 * (VENT-34): the grids of a request ordered finest first, the core's
 * `terrainTile` with its uncovered centre named, and the answer with the
 * tiers that served the samples.
 */
import {
  encodeHeights,
  terrainTile,
  type DemGrid,
  type TerrainTile,
} from '@ventana/sim';
import type { Tier } from './catalogue.ts';
import { TerrainUncoveredError, type TierUse } from './horizon-answer.ts';

/** Samples a side of every tile: 256 cells, a centre sample. */
export const TILE_SAMPLES = 257;

/** Where a tile is asked for: the centre and the side in metres. */
export interface TilePoint {
  readonly lat: number;
  readonly lonEast: number;
  readonly sizeM: number;
}

/** The answer of the tile route, as JSON. */
export interface TileAnswer extends TilePoint {
  /** Samples a side. */
  readonly n: number;
  /** The centre's height, metres above the sphere. */
  readonly groundM: number;
  /** Little-endian float32 heights relative to `groundM`, base64. */
  readonly heights: string;
  /** The finest tier that served a sample. */
  readonly resolutionM: number;
  /** The tiers that served the samples, finest first. */
  readonly tiers: readonly TierUse[];
  /** The share of the samples some tier covered. */
  readonly coverage: number;
}

/** The tile of `point` over `grids`, finest first. */
export function tileOf(
  grids: readonly DemGrid[],
  point: TilePoint,
): TerrainTile {
  try {
    const centre = { latDeg: point.lat, lonEastDeg: point.lonEast };
    return terrainTile(grids, centre, point.sizeM, TILE_SAMPLES);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new TerrainUncoveredError('no terrain grid covers the point');
    }
    throw error;
  }
}

const round = (value: number, digits: number): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

/** The route's answer for a computed tile. */
export function tileAnswer(
  point: TilePoint,
  tile: TerrainTile,
  present: readonly Tier[],
): TileAnswer {
  const tiers = present
    .filter((t) => tile.stopsByGrid[t.id] !== undefined)
    .map((t) => ({
      id: t.id,
      resolutionM: t.resolutionM,
      share: round((tile.stopsByGrid[t.id] ?? 0) / tile.covered, 4),
    }))
    .sort((a, b) => a.resolutionM - b.resolutionM);
  return {
    ...point,
    n: tile.n,
    groundM: round(tile.groundM, 2),
    heights: encodeHeights(tile.heights),
    resolutionM: tiers[0]?.resolutionM ?? 0,
    tiers,
    coverage: round(tile.covered / (tile.n * tile.n), 4),
  };
}
