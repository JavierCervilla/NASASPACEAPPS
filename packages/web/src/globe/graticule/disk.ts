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
 * The Moon's disc on the screen, and keeping a label inside it (VENT-50): a
 * label that stands at the limb would hang over the sky, so it is moved
 * toward the disc's centre until its whole box is inside, a margin from
 * the edge. Pure.
 */
import type { Vec3 } from '../geo';
import type { ScreenPoint } from '../marker-cull';

/** The Moon as it shows: its centre and radius, px. */
export interface Disk {
  readonly at: ScreenPoint;
  readonly radius: number;
}

/** The room a label's box keeps from the Moon's edge, px. */
export const LIMB_MARGIN_PX = 14;

/** A label's box, px. */
export interface Box {
  readonly width: number;
  readonly height: number;
}

/**
 * The Moon's disc for a camera at `eye` (Moon radii, from the centre),
 * where `project` puts the points of the sphere. The sphere's outline is
 * a circle round the centre's image, and the tangent point on the camera's
 * right is on it.
 */
export function moonDisk(
  project: (point: Vec3) => ScreenPoint,
  eye: Vec3,
): Disk {
  const d2 = eye.x * eye.x + eye.y * eye.y + eye.z * eye.z;
  // Right of the camera: north (0, 1, 0) crossed with the eye, unit length.
  const side = Math.hypot(eye.z, eye.x) || 1;
  const reach = Math.sqrt(Math.max(0, 1 - 1 / d2));
  const tangent = {
    x: eye.x / d2 + (reach * eye.z) / side,
    y: eye.y / d2,
    z: eye.z / d2 - (reach * eye.x) / side,
  };
  const at = project({ x: 0, y: 0, z: 0 });
  const edge = project(tangent);
  return { at, radius: Math.hypot(edge.x - at.x, edge.y - at.y) };
}

/**
 * `at` moved straight toward the disc's centre, no further than it takes
 * for the whole `box` centred there to lie `LIMB_MARGIN_PX` inside the
 * edge; null when the box cannot fit the disc at all.
 */
export function insideDisk(
  at: ScreenPoint,
  box: Box,
  disk: Disk,
): ScreenPoint | null {
  const [vx, vy] = [at.x - disk.at.x, at.y - disk.at.y];
  const reach = disk.radius - LIMB_MARGIN_PX;
  // The box's corner farthest from the centre, which leaves the disc first.
  const kx = (Math.sign(vx || 1) * box.width) / 2;
  const ky = (Math.sign(vy || 1) * box.height) / 2;
  const room = reach * reach - (kx * kx + ky * ky);
  if (room < 0) return null;
  const [a, b] = [vx * vx + vy * vy, vx * kx + vy * ky];
  if (a === 0 || a + 2 * b + kx * kx + ky * ky <= reach * reach) return at;
  const t = (-b + Math.sqrt(b * b + a * room)) / a;
  return { x: disk.at.x + vx * t, y: disk.at.y + vy * t };
}
