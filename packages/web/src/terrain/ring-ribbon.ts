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
 * The distance rings on the ground (VENT-34): a thin ribbon round the
 * point at each distance, over the drawn ground, wider with distance so
 * the far ring still shows. Pure.
 */
import type { MeshBuffers } from './shapes';
import type { GroundAt } from './stones';

/** The ribbon's width per metre of radius. */
const WIDTH_PER_M = 0.004;
const STEPS = 360;

/** The ribbon of radius `r` metres. */
export function ringRibbon(r: number, ground: GroundAt): MeshBuffers {
  const half = Math.max(r * WIDTH_PER_M, 0.08) / 2;
  const positions = new Float32Array((STEPS + 1) * 6);
  const normals = new Float32Array((STEPS + 1) * 6);
  const index = new Uint32Array(STEPS * 6);
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * 2 * Math.PI;
    const [s, c] = [Math.sin(a), Math.cos(a)];
    const lift = 0.12 + r * 1e-3;
    for (const [k, rr] of [[0, r - half], [1, r + half]] as const) {
      const [east, north] = [s * rr, c * rr];
      positions.set([east, ground(east, north) + lift, -north], i * 6 + k * 3);
      normals.set([0, 1, 0], i * 6 + k * 3);
    }
    if (i < STEPS) {
      const k = i * 2;
      index.set([k, k + 1, k + 2, k + 2, k + 1, k + 3], i * 6);
    }
  }
  return { positions, normals, index };
}
