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
 * The tiles of one level that reach the square around a point (VENT-46),
 * each with the distance of its centre from the point, in the units of its
 * scheme, to order them. Pure.
 */
import type { TileCentre } from './terrain-tile.ts';
import { planePoint } from './tile-locate.ts';
import {
  LUNAR_RADIUS_M,
  levelSize,
  type TileKey,
  type TileScheme,
} from './tile-scheme.ts';

const DEG = Math.PI / 180;
const FULL_TURN = 360;
/** Keeps the longitude reach finite next to a pole. */
const MIN_COS_LAT = 1e-3;

export interface Candidate {
  readonly key: TileKey;
  readonly distance: number;
}

/** The whole numbers from `from` to `to`. */
export function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * The tiles of the polar plane within `radiusM` of the centre. The plane
 * stretches the ground by at most 2 / (1 + sin lat) at the point of the
 * ring nearest the equator, so the square is that much wider.
 */
export function polarCandidates(
  scheme: TileScheme,
  centre: TileCentre,
  level: number,
  radiusM: number,
): Candidate[] {
  const pole = scheme === 'polar-south' ? 'south' : 'north';
  const [cx, cy] = planePoint(pole, centre.latDeg, centre.lonEastDeg);
  const reachDeg = radiusM / LUNAR_RADIUS_M / DEG;
  const farLat = Math.max(0, Math.abs(centre.latDeg) - reachDeg);
  const reach = (radiusM * 2) / (1 + Math.sin(farLat * DEG));
  const size = levelSize(scheme, level);
  const cell = (v: number): number => Math.floor(v / size);
  return range(cell(cx - reach), cell(cx + reach)).flatMap((x) =>
    range(cell(cy - reach), cell(cy + reach)).map((y) => ({
      key: { scheme, level, x, y },
      distance: Math.hypot((x + 0.5) * size - cx, (y + 0.5) * size - cy),
    })),
  );
}

/** The columns of the lat-lon grid within `reach` degrees of `lon`. */
function lonColumns(lon: number, reach: number, size: number): number[] {
  const columns = FULL_TURN / size;
  const from = Math.floor((lon - reach) / size);
  const xs = range(from, Math.floor((lon + reach) / size));
  return [...new Set(xs.map((x) => ((x % columns) + columns) % columns))];
}

/** The signed distance east from `from` to `to`, degrees, in -180 to 180. */
const wrapDelta = (to: number, from: number): number =>
  ((((to - from + 540) % FULL_TURN) + FULL_TURN) % FULL_TURN) - 180;

/**
 * The tiles of the lat-lon grid within `radiusM` of the centre: the
 * longitude reach widens by 1 / cos(lat) at the ring's far latitude, and
 * the columns wrap across the 0° E seam.
 */
export function latlonCandidates(
  centre: TileCentre,
  level: number,
  radiusM: number,
): Candidate[] {
  const { latDeg, lonEastDeg } = centre;
  const size = levelSize('latlon', level);
  const reachLat = radiusM / LUNAR_RADIUS_M / DEG;
  const farLat = (Math.abs(latDeg) + reachLat) * DEG;
  const reachLon = reachLat / Math.max(MIN_COS_LAT, Math.cos(farLat));
  const lon = ((lonEastDeg % FULL_TURN) + FULL_TURN) % FULL_TURN;
  const cell = (v: number): number => Math.floor(v / size);
  const ys = range(cell(latDeg - reachLat), cell(latDeg + reachLat));
  const squeeze = Math.cos(latDeg * DEG);
  return lonColumns(lon, reachLon, size).flatMap((x) =>
    ys.map((y) => {
      const across = wrapDelta((x + 0.5) * size, lon) * squeeze;
      const key = { scheme: 'latlon' as const, level, x, y };
      return { key, distance: Math.hypot(across, (y + 0.5) * size - latDeg) };
    }),
  );
}
