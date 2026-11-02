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
 * The tiles that cover a ring around a point, level by level (VENT-46): the
 * list a viewer asks for before it streams. Level `L` covers a square of
 * half-side one tile of that level (2, 8, 32 and 128 km) around the point,
 * so each level takes at most 3 x 3 tiles on the polar plane (more on the
 * lat-lon grid, where a tile is narrower than it is tall: up to 6 x 3 at
 * 60°), the tile the point is in first and then the nearest first. Levels
 * overlap: a coarse tile lies under the finer ones, and the viewer decides
 * what to draw where. Pure.
 */
import type { TileCentre } from './terrain-tile.ts';
import {
  latlonCandidates,
  polarCandidates,
  range,
  type Candidate,
} from './tile-candidates.ts';
import { isTileKey } from './tile-key.ts';
import { tileContaining } from './tile-locate.ts';
import {
  TILE_LEVELS,
  levelSize,
  nominalSpacingM,
  schemeFor,
  type TileKey,
  type TileScheme,
} from './tile-scheme.ts';

/** Levels listed when the caller does not say: to 32 km. */
export const DEFAULT_LEVELS = 3;

/** The tiles of one level, the point's own first and then nearest first. */
export interface TileRing {
  readonly level: number;
  /** Half-side of the covered square: one tile of the level, metres. */
  readonly sizeM: number;
  /** The nominal ground distance between nodes, metres. */
  readonly spacingM: number;
  readonly tiles: readonly TileKey[];
}

export interface TilePlan {
  readonly scheme: TileScheme;
  readonly levels: readonly TileRing[];
}

const isSame = (a: TileKey, b: TileKey): boolean => a.x === b.x && a.y === b.y;

function ringOf(
  scheme: TileScheme,
  centre: TileCentre,
  level: number,
): TileRing {
  const sizeM = levelSize('polar-south', level);
  const found =
    scheme === 'latlon'
      ? latlonCandidates(centre, level, sizeM)
      : polarCandidates(scheme, centre, level, sizeM);
  // A point on a shared edge is as near two centres: the one it is in leads.
  const { latDeg, lonEastDeg } = centre;
  const under = tileContaining(scheme, level, latDeg, lonEastDeg);
  const rank = (c: Candidate): number =>
    isSame(c.key, under) ? -1 : c.distance;
  const tiles = found
    .filter((c) => isTileKey(c.key))
    .sort((a, b) => rank(a) - rank(b))
    .map((c) => c.key);
  return { level, sizeM, spacingM: nominalSpacingM(level), tiles };
}

/**
 * The tiles of levels `0 .. levels - 1` around `centre`, in the scheme of
 * its latitude.
 *
 * @throws RangeError when `levels` is not a whole number from 1 to 4.
 */
export function tilesAround(
  centre: TileCentre,
  levels: number = DEFAULT_LEVELS,
): TilePlan {
  if (!Number.isInteger(levels) || levels < 1 || levels > TILE_LEVELS) {
    const text = `levels must be a whole number from 1 to ${TILE_LEVELS}`;
    throw new RangeError(text);
  }
  const scheme = schemeFor(centre.latDeg);
  const rings = range(0, levels - 1).map((l) => ringOf(scheme, centre, l));
  return { scheme, levels: rings };
}
