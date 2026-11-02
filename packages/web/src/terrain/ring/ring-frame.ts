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
 * The session's local frame for the relief rings (VENT-46): the site is the
 * origin, x east, y up, z south (as tile-mesh.ts), and the Moon's curvature
 * is in the positions themselves: a node at `h` metres over the sphere
 * and the site's tangent plane `d` metres away lies `d^2 / 2R` lower, with
 * no correction to subtract (docs/terrain-api.md). Pure.
 */
import { LUNAR_RADIUS_M } from '@ventana/sim';
import type { Vec3 } from '../view-camera';
import { cross, dot, mix } from '../vec3';

const RAD = Math.PI / 180;

export interface Frame {
  /** The site's unit vector (x to 0° E, y to 90° E, z north) = up. */
  readonly up: Vec3;
  readonly east: Vec3;
  readonly north: Vec3;
  /** The height of the site over the sphere: the frame's y = 0. */
  readonly groundM: number;
}

/** The unit vector of a point (x, y towards 0° E and 90° E, z north). */
export function unitOf(latDeg: number, lonEastDeg: number): Vec3 {
  const [lat, lon] = [latDeg * RAD, lonEastDeg * RAD];
  const flat = Math.cos(lat);
  return [flat * Math.cos(lon), flat * Math.sin(lon), Math.sin(lat)];
}

/** The frame at `site`, whose ground stands `groundM` over the sphere. */
export function frameAt(
  site: { readonly lat: number; readonly lonEast: number },
  groundM: number,
): Frame {
  const up = unitOf(site.lat, site.lonEast);
  const lon = site.lonEast * RAD;
  const east: Vec3 = [-Math.sin(lon), Math.cos(lon), 0];
  return { up, east, north: cross(up, east), groundM };
}

/** A node at unit vector `dir`, `h` over the sphere: x, y, z of the frame. */
export function toLocal(frame: Frame, dir: Vec3, h: number): Vec3 {
  const r = LUNAR_RADIUS_M + h;
  const [x, n, w] = [dot(dir, frame.east), dot(dir, frame.north),
    dot(dir, frame.up)];
  return [x * r, w * r - LUNAR_RADIUS_M - frame.groundM, -n * r];
}

/**
 * The unit vector over the frame's `east`, `north` metres, for a surface
 * `h` over the sphere (the inverse of {@link toLocal}, which keeps the
 * projection on the tangent plane, not the arc).
 */
export function fromLocal(
  frame: Frame,
  east: number,
  north: number,
  h: number,
): Vec3 {
  const r = LUNAR_RADIUS_M + h;
  const w = Math.sqrt(Math.max(r * r - east * east - north * north, 0));
  const flat = mix(frame.east, east / r, frame.north, north / r);
  return mix(flat, 1, frame.up, w / r);
}
