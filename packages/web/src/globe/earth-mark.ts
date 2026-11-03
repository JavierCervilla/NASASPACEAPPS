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
 * The Earth mark of the globe's compass (VENT-50): where the Earth lies on
 * the screen, seen from the camera. The camera always looks at the Moon's
 * centre with north up (framing.ts, stage.ts `aimCamera`), so the screen's
 * axes follow from the camera's position alone: up is north as far as the
 * view tilts, right is east. The Earth is so far off that its direction is
 * the sub-Earth point's, the same from anywhere near the Moon. Pure.
 */
import { SOUTH_POLE_VIEW } from './framing';
import { isFacing, latLonToVector, type Vec3 } from './geo';

export interface EarthMark {
  /** Degrees clockwise from the top of the screen, in (-180, 180]. */
  readonly angleDeg: number;
  /**
   * True when the sub-Earth point is behind the limb of the whole Moon as
   * the opening zoom shows it: the Earth is behind the Moon. The mark then
   * keeps the direction it is hidden in.
   */
  readonly far: boolean;
  /** How far the point is from the Moon's centre on screen, in radii. */
  readonly offset: number;
}

/** The eight places a mark can be named at, round the ring. */
export type Sector =
  | 'top'
  | 'topRight'
  | 'right'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'left'
  | 'topLeft';

const SECTORS: readonly Sector[] = [
  'top',
  'topRight',
  'right',
  'bottomRight',
  'bottom',
  'bottomLeft',
  'left',
  'topLeft',
];

const RAD = Math.PI / 180;

/**
 * The camera distance, Moon radii, whose limb says whether the Earth is
 * behind the Moon: the opening view's, for every zoom. A zoom does not
 * turn the Moon, so it must not hide the Earth (VENT-51): from the
 * closest zoom (1.6 radii) the visible cap is 51° round the view's centre
 * and the opening view's Earth, about 66° from it, would leave it.
 */
const LIMB_DISTANCE = SOUTH_POLE_VIEW.distance;
const NORTH: Vec3 = { x: 0, y: 1, z: 0 };

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/**
 * Where the sub-Earth point `earth` shows for a camera at `eye` (Moon
 * radii, from the centre), looking at the centre with north up.
 */
export function earthMark(
  eye: Vec3,
  earth: { readonly latDeg: number; readonly lonEastDeg: number },
): EarthMark {
  const back = unit(eye);
  const right = unit(cross(NORTH, back));
  const up = cross(back, right);
  const point = latLonToVector(earth.latDeg, earth.lonEastDeg);
  const [x, y] = [dot(point, right), dot(point, up)];
  const limbEye = {
    x: back.x * LIMB_DISTANCE,
    y: back.y * LIMB_DISTANCE,
    z: back.z * LIMB_DISTANCE,
  };
  return {
    angleDeg: Math.atan2(x, y) / RAD,
    far: !isFacing(point, limbEye),
    offset: Math.hypot(x, y),
  };
}

/** The place round the ring that `angleDeg` falls in. */
export function sectorOf(angleDeg: number): Sector {
  const index = Math.round(angleDeg / 45);
  return SECTORS[((index % 8) + 8) % 8] ?? 'top';
}
