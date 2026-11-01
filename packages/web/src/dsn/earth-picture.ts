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
 * Everything one DSN picture of the Earth draws at an instant (VENT-7): the
 * land, the night side from the real sub-solar point, the ring where the
 * Moon stands above 10°, the point with the Moon overhead and the three
 * antennas. The card's small Earth is the face the Moon sees (centred on the
 * Moon overhead); the DSN view looks from further west, so the antenna the
 * Moon is moving toward is in sight and the ring's edge shows. Pure.
 */
import {
  DSN_COMPLEXES,
  earthSubSolarPoint,
  subLunarPoint,
  type DsnComplex,
  type DsnState,
} from '@ventana/sim';
import { circlePath, type CircleArcs } from './earth-circle';
import { landPath, nightPath } from './earth-paths';
import type { GeoDot } from './land-dots';
import { projectVec, unit, viewBasis, type ViewBasis } from './orthographic';
import { stationDot } from './stations';

/**
 * The Moon stands above 10° within about 79° of the point under it: 80°
 * less its parallax seen from the Earth's surface (about 1°).
 */
const RING_DEG = 79;
/** The DSN view's look: this far west of the Moon, from this latitude. */
const WIDE_WEST_DEG = 48;
const WIDE_LAT_DEG = 15;

export interface PicturePoint {
  readonly x: number;
  readonly y: number;
  /** On the visible face. */
  readonly front: boolean;
}

export interface PictureStation extends PicturePoint {
  readonly complex: DsnComplex;
  readonly active: boolean;
  /** It sees the Moon above 10°. */
  readonly sees: boolean;
}

export interface EarthPicture {
  readonly r: number;
  readonly land: string;
  readonly night: string;
  readonly ring: CircleArcs;
  readonly moon: PicturePoint;
  readonly stations: readonly PictureStation[];
}

export interface PictureInput {
  readonly atMs: number;
  /** The disk's radius in SVG units. */
  readonly r: number;
  readonly dots: readonly GeoDot[];
  readonly wide: boolean;
  readonly state: DsnState;
}

/** Where a point of the sphere lands on the disk of radius `r`. */
function place(basis: ViewBasis, dot: GeoDot, r: number): PicturePoint {
  const p = projectVec(basis, unit(dot.latDeg, dot.lonDeg));
  return { x: r + p.x * r, y: r - p.y * r, front: p.z > 0 };
}

/** The picture at `input.atMs`. */
export function earthPicture(input: PictureInput): EarthPicture {
  const { atMs, r, dots, wide, state } = input;
  const below = subLunarPoint(atMs);
  const moon: GeoDot = { latDeg: below.latDeg, lonDeg: below.lonEastDeg };
  const centre = wide
    ? { latDeg: WIDE_LAT_DEG, lonDeg: moon.lonDeg - WIDE_WEST_DEG }
    : moon;
  const basis = viewBasis(centre);
  const sun = earthSubSolarPoint(atMs);
  const sunDisk = projectVec(basis, unit(sun.latDeg, sun.lonEastDeg));
  const stations = DSN_COMPLEXES.map((complex) => ({
    complex,
    ...place(basis, stationDot(complex), r),
    active: state.active === complex,
    sees: state.above.includes(complex),
  }));
  return {
    r,
    land: landPath(dots, basis, r),
    night: nightPath(sunDisk, r),
    ring: circlePath(unit(moon.latDeg, moon.lonDeg), RING_DEG, basis, r),
    moon: place(basis, moon, r),
    stations,
  };
}
