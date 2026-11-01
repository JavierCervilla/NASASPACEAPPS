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
 * A circle of the Earth's sphere (the ring where the Moon stands above 10°)
 * as SVG path data: its arcs on the visible face of a disk of radius `r`
 * centred at (`r`, `r`), and its highest visible point for a label. Pure.
 */
import { projectVec, type Vec3, type ViewBasis } from './orthographic';

const DEG = Math.PI / 180;
/** Degrees between the points along the circle. */
const STEP_DEG = 2;

/** A circle's visible arcs, and its highest visible point (null: none). */
export interface CircleArcs {
  readonly d: string;
  readonly top: { readonly x: number; readonly y: number } | null;
}

/** Two unit vectors across `centre` (a unit vector) and each other. */
function axesAcross(centre: Vec3): [Vec3, Vec3] {
  const [cx, cy, cz] = centre;
  const across: Vec3 = Math.abs(cz) < 0.9 ? [cy, -cx, 0] : [0, cz, -cy];
  const n = Math.hypot(...across);
  const [ax, ay, az] = [across[0] / n, across[1] / n, across[2] / n];
  return [
    [ax, ay, az],
    [cy * az - cz * ay, cz * ax - cx * az, cx * ay - cy * ax],
  ];
}

/** The point `deg` along the circle of angular radius `radiusDeg`. */
function along(
  centre: Vec3,
  axes: [Vec3, Vec3],
  radiusDeg: number,
  deg: number,
): Vec3 {
  const [a, b] = axes;
  const [cr, sr] = [Math.cos(radiusDeg * DEG), Math.sin(radiusDeg * DEG)];
  const [ct, st] = [Math.cos(deg * DEG), Math.sin(deg * DEG)];
  const at = (k: 0 | 1 | 2): number =>
    centre[k] * cr + (a[k] * ct + b[k] * st) * sr;
  return [at(0), at(1), at(2)];
}

/**
 * The circle `radiusDeg` from `centre` on the sphere, as the arcs on the
 * visible face.
 */
export function circlePath(
  centre: Vec3,
  radiusDeg: number,
  basis: ViewBasis,
  r: number,
): CircleArcs {
  const axes = axesAcross(centre);
  const svg = (v: number): number => Math.round(v * 10) / 10;
  let [d, pen] = ['', false];
  let top: { x: number; y: number } | null = null;
  for (let deg = 0; deg <= 360; deg += STEP_DEG) {
    const p = projectVec(basis, along(centre, axes, radiusDeg, deg));
    const [x, y] = [svg(r + p.x * r), svg(r - p.y * r)];
    if (p.z > 0) d += `${pen ? 'L' : 'M'}${x} ${y}`;
    if (p.z > 0 && (!top || y < top.y)) top = { x, y };
    pen = p.z > 0;
  }
  return { d, top };
}
