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
 * The global tiling of the 3D view's relief (VENT-46). Every tile of every
 * level is a fixed `TILE_SAMPLES` x `TILE_SAMPLES` grid of nodes on a lattice
 * that belongs to the whole Moon, not to a viewer's anchor, so two clients
 * (and the server's cache) share tiles. Two schemes, the projections of the
 * LOLA grids themselves:
 *
 * - `polar-south` and `polar-north`: the polar stereographic plane of the
 *   PDS polar grids (true scale at the pole), for latitudes from 60° to the
 *   pole. The plane is conformal, so cells stay square on the ground; they
 *   are 1.07 times smaller at 60°. A tile is a square of the plane, 2 km
 *   times 4^level a side.
 * - `latlon`: the simple cylindrical grid of the global LOLA tiers, between
 *   the two. A tile is 1/16° times 4^level a side; a degree of longitude is
 *   cos(lat) as long as a degree of latitude, so below 60° a cell is at
 *   most twice as wide as it is high on the ground (at 80° it would be
 *   5.8 times, which is why the polar plane starts at 60°).
 *
 * Four levels, each tile 4 times the one below: 2, 8, 32 and 128 km. A
 * tile has 128 cells, so the node spacing is 15.6 m, 62.5 m, 250 m and 1 km.
 * Tiles of a level share their edge nodes (sample 128 of a tile is sample
 * 0 of the next), and a tile's node (r, c) is a node of the level above
 * when r and c are multiples of 4, at the same place: sizes and spacings are
 * dyadic, so the coordinates are exact in a double. Pure.
 */

/** A_AXIS_RADIUS of every LOLA grid, metres. */
export const LUNAR_RADIUS_M = 1_737_400;
/** Cells a side of a tile. */
export const TILE_CELLS = 128;
/** Samples (nodes) a side of a tile: the cells and one more. */
export const TILE_SAMPLES = TILE_CELLS + 1;
/** Levels of detail: 0 is the finest. */
export const TILE_LEVELS = 4;
/** From this latitude to a pole, the polar plane serves the tiles. */
export const POLAR_MIN_LAT_DEG = 60;

const LEVEL_RATIO = 4;
const POLAR_LEVEL0_M = 2_000;
const LATLON_LEVEL0_DEG = 1 / 16;

export type TileScheme = 'polar-south' | 'polar-north' | 'latlon';

/** A tile: its scheme, level and place in the level's grid of tiles. */
export interface TileKey {
  readonly scheme: TileScheme;
  readonly level: number;
  readonly x: number;
  readonly y: number;
}

/** The scheme that serves a view anchored at `latDeg`. */
export function schemeFor(latDeg: number): TileScheme {
  if (latDeg <= -POLAR_MIN_LAT_DEG) return 'polar-south';
  return latDeg >= POLAR_MIN_LAT_DEG ? 'polar-north' : 'latlon';
}

/** A tile's side at `level`: plane metres (polar) or degrees (latlon). */
export function levelSize(scheme: TileScheme, level: number): number {
  const base = scheme === 'latlon' ? LATLON_LEVEL0_DEG : POLAR_LEVEL0_M;
  return base * LEVEL_RATIO ** level;
}

/** The nominal ground distance between nodes at `level`, metres. */
export function nominalSpacingM(level: number): number {
  return (POLAR_LEVEL0_M * LEVEL_RATIO ** level) / TILE_CELLS;
}
