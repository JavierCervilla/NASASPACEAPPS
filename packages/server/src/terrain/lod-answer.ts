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
 * From the tiers present and an aligned tile to the levelled tile route's
 * answer (VENT-46): which grids a level reads and in what order, the core's
 * `alignedTile` with an uncovered tile named, and the answer with its
 * 16-bit heights, its georeference and the tiers that served the nodes.
 */
import {
  NO_DATA,
  alignedTile,
  encodeQuantised,
  levelQuantumM,
  minDataResolutionM,
  quantiseHeights,
  tileGeoref,
  type AlignedTile,
  type DemGrid,
  type TileGeoref,
  type TileKey,
  type TileScheme,
} from '@ventana/sim';
import type { Tier } from './catalogue.ts';
import { TerrainUncoveredError, type TierUse } from './horizon-answer.ts';

/** The answer of the levelled tile route, as JSON. */
export interface LodAnswer {
  /** The tiers present when it was computed: see `lod-version.ts`. */
  readonly version: string;
  readonly scheme: TileScheme;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  /** Samples a side. */
  readonly n: number;
  readonly georef: TileGeoref;
  /**
   * Height of a sample: `(baseUnits + q) * quantumM`, metres. `quantumM` is
   * the level's (`levelQuantumM`), so tiles of a level decode alike.
   */
  readonly quantumM: number;
  readonly baseUnits: number;
  /** The `q` of a sample without data. */
  readonly noData: number;
  /** `n * n` little-endian uint16 `q` values, base64, rows from north. */
  readonly heights: string;
  readonly minM: number;
  readonly maxM: number;
  /** The finest tier that served a sample. */
  readonly resolutionM: number;
  /** The tiers that served the samples, finest first. */
  readonly tiers: readonly TierUse[];
  /** The share of the samples some tier covered. */
  readonly coverage: number;
}

/**
 * The tiers a level reads, in the order a node tries them: those with data
 * no finer than the level can show, finest first (point-sampling 20 m data
 * at a 250 m spacing aliases the relief and reads more disk for nothing),
 * then the finer ones, coarsest first, only where the first have nothing.
 */
export function tiersForLevel(
  level: number,
  present: readonly Tier[],
): Tier[] {
  const floor = minDataResolutionM(level);
  const byRes = [...present].sort((a, b) => a.resolutionM - b.resolutionM);
  const usable = byRes.filter((t) => t.resolutionM >= floor);
  const tooFine = byRes.filter((t) => t.resolutionM < floor).reverse();
  return [...usable, ...tooFine];
}

/** The tile of `key` over `grids`, in the order of {@link tiersForLevel}. */
export function lodTileOf(
  grids: readonly DemGrid[],
  key: TileKey,
): AlignedTile {
  try {
    return alignedTile(grids, key);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new TerrainUncoveredError('no terrain grid covers the tile');
    }
    throw error;
  }
}

const round = (value: number, digits: number): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

/** The route's answer for a computed tile. */
export function lodAnswer(
  tile: AlignedTile,
  version: string,
  present: readonly Tier[],
): LodAnswer {
  const { key, n } = tile;
  const tiers = present
    .filter((t) => tile.stopsByGrid[t.id] !== undefined)
    .map((t) => ({
      id: t.id,
      resolutionM: t.resolutionM,
      share: round((tile.stopsByGrid[t.id] ?? 0) / tile.covered, 4),
    }))
    .sort((a, b) => a.resolutionM - b.resolutionM);
  const q = quantiseHeights(tile.heights, levelQuantumM(key.level));
  return {
    version, ...key, n, georef: tileGeoref(key),
    quantumM: q.quantumM, baseUnits: q.baseUnits, noData: NO_DATA,
    heights: encodeQuantised(q),
    minM: round(tile.minM, 2), maxM: round(tile.maxM, 2),
    resolutionM: tiers[0]?.resolutionM ?? 0,
    tiers, coverage: round(tile.covered / (n * n), 4),
  };
}
