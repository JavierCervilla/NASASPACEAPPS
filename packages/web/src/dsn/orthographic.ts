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
 * The orthographic projection of the Earth's sphere, as a far observer (the
 * Moon) sees it: a view centred on one point, north up. Coordinates on the
 * unit disk, x east and y north; `z` toward the viewer, positive on the
 * visible face. Pure.
 */
import type { GeoDot } from './land-dots';

export type Vec3 = readonly [number, number, number];

/** A point on the disk; `z > 0` on the face the viewer sees. */
export interface DiskPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The view's axes: toward the viewer, east and north at the centre. */
export interface ViewBasis {
  readonly front: Vec3;
  readonly east: Vec3;
  readonly north: Vec3;
}

const DEG = Math.PI / 180;

/** The unit vector of a point on the sphere. */
export function unit(latDeg: number, lonDeg: number): Vec3 {
  const [lat, lon] = [latDeg * DEG, lonDeg * DEG];
  const c = Math.cos(lat);
  return [c * Math.cos(lon), c * Math.sin(lon), Math.sin(lat)];
}

/** The axes of a view centred on `centre`. */
export function viewBasis(centre: GeoDot): ViewBasis {
  const [lat, lon] = [centre.latDeg * DEG, centre.lonDeg * DEG];
  return {
    front: unit(centre.latDeg, centre.lonDeg),
    east: [-Math.sin(lon), Math.cos(lon), 0],
    north: [
      -Math.sin(lat) * Math.cos(lon),
      -Math.sin(lat) * Math.sin(lon),
      Math.cos(lat),
    ],
  };
}

const dot = (a: Vec3, b: Vec3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Where the direction `v` falls on the disk of the view `basis`. */
export function projectVec(basis: ViewBasis, v: Vec3): DiskPoint {
  const { east, north, front } = basis;
  return { x: dot(v, east), y: dot(v, north), z: dot(v, front) };
}
