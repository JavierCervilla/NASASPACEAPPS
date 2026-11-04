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
 * The fine real-relief tiles (VENT-62): LROC NAC and PGDA digital terrain
 * models prepared by Mooner (MOON-20) as 300 x 300 tiles of 5 m pixels on
 * the polar plane every other part of the app uses (x toward 90° E, y
 * toward 0° E, metres), with a 1-bit mask of where the fine source has a
 * height. The boxes are written here so that whether a point has a tile
 * is known without a request; `tests/fine-catalog.test.ts` holds them to
 * the shipped `tile.json` files. Provenance and credits: ASSETS.md.
 */
import { LUNAR_RADIUS_M } from '@ventana/sim';

/** The source of a tile, for the caption. */
export type FineKind = 'nac' | 'pgda';

export interface FineSite {
  readonly folder: string;
  readonly kind: FineKind;
  /** The resolution of the source product, metres. */
  readonly sourceM: number;
  /** Plane X of the upper-left corner, and Y: columns run +x, rows -y. */
  readonly ulx: number;
  readonly uly: number;
  readonly pixelM: number;
  /** Pixels a side. */
  readonly size: number;
  /** Height in metres over the sphere is `offsetM + DN * stepM`. */
  readonly offsetM: number;
  readonly stepM: number;
  readonly sha256: string;
}

interface Row {
  readonly folder: string;
  readonly kind: FineKind;
  readonly sourceM: number;
  readonly corner: readonly [number, number];
  readonly offsetM: number;
  readonly sha256: string;
}

const tile = (row: Row): FineSite => ({ folder: row.folder, kind: row.kind,
  sourceM: row.sourceM, ulx: row.corner[0], uly: row.corner[1], pixelM: 5,
  size: 300, offsetM: row.offsetM, stepM: 0.01, sha256: row.sha256 });

export const FINE_SITES: readonly FineSite[] = [
  tile({ folder: 'mons-mouton', kind: 'nac', sourceM: 4,
    corner: [76360, 138760], offsetM: 5275,
    sha256:
      '0d80071611afc365c3e0968185aeca98c432b2e721a0e5be3b6bc9f7099e46fa' }),
  tile({ folder: 'malapert-a', kind: 'nac', sourceM: 3,
    corner: [6780, 300680], offsetM: 2477,
    sha256:
      '6343628da7f32c26d0122b4da3b84dc1c704b9f68b5f81f727b7149d9c2708c1' }),
  tile({ folder: 'shackleton-ridge', kind: 'nac', sourceM: 2,
    corner: [-3520, -8420], offsetM: 1397,
    sha256:
      'ebea5be8a832c4bf155cbbfaa0b78ff3dded698704a016362c8c0db24383cb12' }),
  tile({ folder: 'malapert-massif', kind: 'pgda', sourceM: 5,
    corner: [-4320, 122640], offsetM: 4748,
    sha256:
      '5cf84011739655609bafdd98c768ebf5063d3fcb15ca2cc9db505b4d2adfecf2' }),
];

/** The south polar plane's X, Y of a point (the sim's convention). */
export function planeOf(latDeg: number, lonEastDeg: number): [number, number] {
  const [lat, lon] = [(latDeg * Math.PI) / 180, (lonEastDeg * Math.PI) / 180];
  const flat = Math.cos(lat);
  return planeOfDir(
    [flat * Math.cos(lon), flat * Math.sin(lon), Math.sin(lat)]);
}

/** The plane's X, Y of a unit vector (x to 0° E, y to 90° E, z north). */
export function planeOfDir(
  dir: readonly [number, number, number],
): [number, number] {
  const k = (2 * LUNAR_RADIUS_M) / (1 - dir[2]);
  return [k * dir[1], k * dir[0]];
}

/** The tile that holds the point, or null: a point of the north has none. */
export function fineSiteAt(
  latDeg: number,
  lonEastDeg: number,
): FineSite | null {
  if (latDeg > -60) return null;
  const [x, y] = planeOf(latDeg, lonEastDeg);
  return FINE_SITES.find((s) => {
    const side = s.size * s.pixelM;
    return x >= s.ulx && x <= s.ulx + side && y <= s.uly && y >= s.uly - side;
  }) ?? null;
}
