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
 * The lander placeholder's shape (VENT-34): clean primitives until a
 * licensed model is chosen (the caption says so): a hexagonal body, a foil
 * band, a nozzle, and four splayed legs on pads, 2.6 m from the axis.
 * Three buffers, one per material: body, foil, dark. Pure, in metres
 * around its foot.
 */
import { merge, tube, type MeshBuffers } from './shapes';
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
    body: merge([vertical([1.0, 3.2], [1.3, 1.1]),
      ...legs.map((l) => l.pad)]),
    foil: vertical([1.05, 1.55], [1.33, 1.33]),
    dark: merge([vertical([0.4, 1.0], [0.6, 0.25], 20),
      vertical([3.2, 3.4], [1.0, 0.9]), ...legs.map((l) => l.leg)]),
  };
}
