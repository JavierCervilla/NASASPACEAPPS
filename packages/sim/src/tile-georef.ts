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
 * Where a tile's samples lie (VENT-46): the georeference a client needs to
 * place them, and the unit vector of any sample. Sample `(row, col)` of a
 * tile is a node of the tiling: rows run from the tile's north (or the
 * plane's +Y) edge, columns from its west (or the plane's -X) edge.
 *
 * Polar plane, as the PDS grids and `pixelOf` define it: with `k = 2R / (1 -
 * z)` for the south pole and `2R / (1 + z)` for the north, a unit vector
 * `(p0, p1, z)` is at `X = k p1`, `Y = k p0` (south) or `Y = -k p0` (north),
 * so 90° E is +X on both and 0° E is +Y at the south pole and -Y at the
 * north. The inverse needs no trigonometry. Pure.
 */
import { unitVector, type Vec3 } from './horizon.ts';
import {
  LUNAR_RADIUS_M,
  TILE_CELLS,
  levelSize,
  type TileKey,
} from './tile-scheme.ts';

export interface PolarGeoref {
  readonly kind: 'polar';
  readonly pole: 'south' | 'north';
  readonly radiusM: number;
  /** Plane X of column 0, metres; column `c` is at `minX + c * spacingM`. */
  readonly minX: number;
  /** Plane Y of row 0, metres; row `r` is at `maxY - r * spacingM`. */
  readonly maxY: number;
  readonly spacingM: number;
}

export interface LatLonGeoref {
  readonly kind: 'latlon';
  readonly radiusM: number;
  /** East longitude of column 0; column `c` is at `west + c * spacing`. */
  readonly westDeg: number;
  /** Latitude of row 0; row `r` is at `north - r * spacing`. */
  readonly northDeg: number;
  readonly spacingDeg: number;
}

export type TileGeoref = PolarGeoref | LatLonGeoref;

/** The georeference of `key`. */
export function tileGeoref(key: TileKey): TileGeoref {
  const size = levelSize(key.scheme, key.level);
  const spacing = size / TILE_CELLS;
  if (key.scheme === 'latlon') {
    const west = key.x * size;
    const north = (key.y + 1) * size;
    return {
      kind: 'latlon', radiusM: LUNAR_RADIUS_M, westDeg: west,
      northDeg: north, spacingDeg: spacing,
    };
  }
  const pole = key.scheme === 'polar-south' ? 'south' : 'north';
  const [minX, maxY] = [key.x * size, (key.y + 1) * size];
  return { kind: 'polar', pole, radiusM: LUNAR_RADIUS_M, minX, maxY, spacingM: spacing };
}

function polarDirection(g: PolarGeoref, row: number, col: number): Vec3 {
  const x = g.minX + col * g.spacingM;
  const y = g.maxY - row * g.spacingM;
  const rho = Math.hypot(x, y);
  const sign = g.pole === 'south' ? -1 : 1;
  if (rho === 0) return [0, 0, sign];
  const t = rho / (2 * g.radiusM);
  const flat = (2 * t) / (1 + t * t);
  const z = (sign * (1 - t * t)) / (1 + t * t);
  return [(-sign * y * flat) / rho, (x * flat) / rho, z];
}

function latlonDirection(g: LatLonGeoref, row: number, col: number): Vec3 {
  const lon = (g.westDeg + col * g.spacingDeg) % 360;
  return unitVector(g.northDeg - row * g.spacingDeg, lon);
}

/** The unit vector (x to 0° E, y to 90° E, z north) of a sample. */
export function sampleDirection(
  georef: TileGeoref,
  row: number,
  col: number,
): Vec3 {
  return georef.kind === 'polar'
    ? polarDirection(georef, row, col)
    : latlonDirection(georef, row, col);
}
