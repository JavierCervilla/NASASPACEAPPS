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
 * The lander placeholder's shape (VENT-34): primitives (the caption says
 * so; NASA's only public-domain landers are Apollo's, not a 2026 CLPS
 * one): a hexagonal body under a dome, two tanks, a foil band, a nozzle, a
 * mast and dish, and four splayed legs on pads, 2.6 m from the axis.
 * Three buffers, one per material: body, foil, dark. Pure, in metres
 * around its foot.
 */
import { merge, sphere, tube, type MeshBuffers } from './shapes';
import type { Vec3 } from './view-camera';

/** The pads' distance from the axis, metres. */
export const LANDER_FOOT_M = 2.6;

export interface LanderBuffers {
  readonly body: MeshBuffers;
  readonly foil: MeshBuffers;
  readonly dark: MeshBuffers;
}

/** A tube up the axis from `y0` to `y1`, radii `r0` to `r1`. */
const vertical = ([y0, y1]: readonly [number, number],
  [r0, r1]: readonly [number, number], sides = 6) => tube({ from: [0, y0, 0],
  to: [0, y1, 0], radiusFrom: r0, radiusTo: r1, sides });

/** The unit sphere scaled by `r` (x, y, z) and moved to `at`. */
function ball(r: Vec3, at: Vec3, rings = 8): MeshBuffers {
  const unit = sphere(rings * 2, rings);
  const positions = unit.positions.map((v, i) => v * r[i % 3]! + at[i % 3]!);
  const normals = unit.normals.map((v, i) => v / r[i % 3]!);
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!) || 1;
    normals.set([normals[i]! / len, normals[i + 1]! / len,
      normals[i + 2]! / len], i);
  }
  return { positions, normals, index: unit.index };
}

/** A leg and its pad, at `angle` round the axis. */
function leg(angle: number): { leg: MeshBuffers; pad: MeshBuffers } {
  const [s, c] = [Math.sin(angle), Math.cos(angle)];
  const top: Vec3 = [s * 1.15, 1.6, c * 1.15];
  const foot: Vec3 = [s * LANDER_FOOT_M, 0.1, c * LANDER_FOOT_M];
  const pad = tube({ from: [foot[0], 0, foot[2]], to: [foot[0], 0.1, foot[2]],
    radiusFrom: 0.48, radiusTo: 0.4, sides: 16 });
  return { leg: tube({ from: top, to: foot, radiusFrom: 0.05,
    radiusTo: 0.05, sides: 8 }), pad };
}

/** The lander's three buffers. */
export function landerBuffers(): LanderBuffers {
  const legs = [0, 1, 2, 3].map((i) => leg((i + 0.5) * (Math.PI / 2)));
  return {
    body: merge([vertical([1.0, 3.2], [1.3, 1.1]), ball([1.05, 0.5, 1.05],
      [0, 3.2, 0], 10), ball([0.42, 0.42, 0.42], [1.38, 2.3, 0]),
      ball([0.42, 0.42, 0.42], [-1.38, 2.3, 0]), ball([0.32, 0.1, 0.32],
        [0, 4.55, 0]), ...legs.map((l) => l.pad)]),
    foil: vertical([1.05, 1.55], [1.33, 1.33]),
    dark: merge([vertical([0.4, 1.0], [0.6, 0.25], 20),
      tube({ from: [0, 3.5, 0], to: [0, 4.5, 0], radiusFrom: 0.03,
        radiusTo: 0.03, sides: 6 }), ...legs.map((l) => l.leg)]),
  };
}
