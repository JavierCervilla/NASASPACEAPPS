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
 * The shapes of the DSN pictures' Earth, as SVG path data on a disk of
 * radius `r` centred at (`r`, `r`): the land as dots (zero-length strokes
 * with round caps, one path for all of them) and the night side bounded by
 * the terminator. Pure.
 */
import type { GeoDot } from './land-dots';
import {
  projectVec,
  unit,
  type DiskPoint,
  type ViewBasis,
} from './orthographic';
/** Points along each half of the night side's outline. */
const OUTLINE_STEPS = 48;
/** Dots this close to the limb are left out: they would be flat smears. */
const LIMB_Z = 0.08;

const round = (n: number): number => Math.round(n * 10) / 10;

/** The SVG point of a disk point on a disk of radius `r`. */
const toSvg = (p: { x: number; y: number }, r: number): string =>
  `${round(r + p.x * r)} ${round(r - p.y * r)}`;

/** Every land dot on the visible face, as one path. */
export function landPath(
  dots: readonly GeoDot[],
  basis: ViewBasis,
  r: number,
): string {
  const parts: string[] = [];
  for (const { latDeg, lonDeg } of dots) {
    const p = projectVec(basis, unit(latDeg, lonDeg));
    if (p.z > LIMB_Z) parts.push(`M${toSvg(p, r)}h0`);
  }
  return parts.join('');
}

/**
 * The night side: half the limb on the side away from the Sun, closed by
 * the half of the terminator's ellipse on the face (its minor axis is the
 * Sun's depth toward the viewer, `sun.z`).
 */
export function nightPath(sun: DiskPoint, r: number): string {
  const h = Math.hypot(sun.x, sun.y);
  const [dx, dy] = h > 1e-6 ? [sun.x / h, sun.y / h] : [1, 0];
  const [ux, uy] = [-dy, dx];
  const points: string[] = [];
  for (let i = 0; i <= 2 * OUTLINE_STEPS; i++) {
    const limb = i <= OUTLINE_STEPS;
    const t = ((limb ? i : i - OUTLINE_STEPS) / OUTLINE_STEPS) * Math.PI;
    const [c, s] = [Math.cos(t), Math.sin(t) * (limb ? 1 : sun.z)];
    const k = limb ? c : -c;
    points.push(toSvg({ x: k * ux - s * dx, y: k * uy - s * dy }, r));
  }
  return `M${points.join('L')}Z`;
}
