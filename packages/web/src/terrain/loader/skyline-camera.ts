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
 * The loader's closing skyline (VENT-60, A): the site's horizon profile,
 * the level and the sky's bodies drawn with the scene's own camera (the
 * eye over the point, the opening look, the vertical field of view over
 * the band), so the line lands on the ridge the scene renders and the
 * Sun and the Earth where it draws them. A body past the band's side is
 * pinned inside it, as the horizon strip does. Pure.
 */
import { cross, dot, unit } from '../vec3';
import { direction, type Look, type Vec3 } from '../view-camera';
import type { Point, Size } from './band-types';

const RAD = Math.PI / 180;
/** Nothing nearer than this along the look is drawn (the scene's plane). */
const NEAR = 0.2;
/** Degrees of profile drawn past each side, and between two points. */
const PAST_DEG = 3;
const STEP_DEG = 0.5;
/** A body closer to a side than this is pinned inside it, px. */
const EDGE_PX = 14;
const PIN_PX = 22;

export interface LoaderCamera extends Size {
  /** Focal length, px. */
  readonly f: number;
  readonly look: Look;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  /** Half the field across, degrees. */
  readonly halfDeg: number;
}

/** Half the field a camera of `vfovDeg` sees across `size`, degrees. */
export function halfFieldDeg({ w, h }: Size, vfovDeg: number): number {
  const f = h / 2 / Math.tan((vfovDeg / 2) * RAD);
  return Math.atan(w / 2 / f) / RAD;
}

/** The scene's camera on a band of `size`, looking along `look`. */
export function loaderCamera(
  size: Size,
  vfovDeg: number,
  look: Look,
): LoaderCamera {
  const forward = direction(look.yawDeg, look.pitchDeg);
  const right = unit(cross(forward, [0, 1, 0]));
  const f = size.h / 2 / Math.tan((vfovDeg / 2) * RAD);
  return { ...size, f, look, forward, right, up: cross(right, forward),
    halfDeg: halfFieldDeg(size, vfovDeg) };
}

/** Where azimuth `azDeg`, elevation `elDeg` falls on the band, or null. */
export function project(
  cam: LoaderCamera,
  azDeg: number,
  elDeg: number,
): Point | null {
  const v = direction(azDeg, elDeg);
  const z = dot(v, cam.forward);
  if (z <= NEAR) return null;
  return [cam.w / 2 + (cam.f * dot(v, cam.right)) / z,
    cam.h / 2 - (cam.f * dot(v, cam.up)) / z];
}

/**
 * The skyline across the band and a little past it, every half degree:
 * `elevationAt` is the terrain's elevation at an azimuth (0: the level).
 */
export function skylinePoints(
  cam: LoaderCamera,
  elevationAt: (azDeg: number) => number,
): Point[] {
  const span = Math.ceil((cam.halfDeg + PAST_DEG) / STEP_DEG);
  const points: Point[] = [];
  for (let k = -span; k <= span; k++) {
    const az = cam.look.yawDeg + k * STEP_DEG;
    const p = project(cam, az, elevationAt(az));
    if (p) points.push(p);
  }
  return points;
}

/** A body on the band, or pinned inside the side it lies past (-1, 1). */
export function bodyPlace(cam: LoaderCamera, azDeg: number, elDeg: number) {
  const p = project(cam, azDeg, elDeg);
  if (p && p[0] >= EDGE_PX && p[0] <= cam.w - EDGE_PX) {
    return { x: p[0], y: p[1], pinned: 0 as const };
  }
  const rel = ((((azDeg - cam.look.yawDeg + 540) % 360) + 360) % 360) - 180;
  const y = cam.h / 2 - cam.f * Math.tan((elDeg - cam.look.pitchDeg) * RAD);
  return rel < 0 ? { x: PIN_PX, y, pinned: -1 as const }
    : { x: cam.w - PIN_PX, y, pinned: 1 as const };
}
