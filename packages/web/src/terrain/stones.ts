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
 * The illustrative rocks as one mesh (VENT-34): a round stone per rock,
 * squashed, turned and sat a little into the drawn ground. Pure.
 */
import type { Rock } from './rocks';
import { merge, sphere, type MeshBuffers } from './shapes';

/** The ground's height at a spot in the session's frame. */
export type GroundAt = (east: number, north: number) => number;

/** Low enough to be cheap, round enough to read as a stone. */
const STONE = sphere(8, 5);

/** The stone of `rock` on `ground`. */
function stone(rock: Rock, ground: GroundAt): MeshBuffers {
  const [sx, sy, sz] = [rock.radius * 1.15, rock.radius * rock.squash,
    rock.radius];
  const [c, s] = [Math.cos(rock.yawRad), Math.sin(rock.yawRad)];
  const y0 = ground(rock.east, rock.north) + sy * 0.35;
  const positions = new Float32Array(STONE.positions.length);
  const normals = new Float32Array(STONE.normals.length);
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = [STONE.positions[i] ?? 0, STONE.positions[i + 1] ?? 0,
      STONE.positions[i + 2] ?? 0];
    const [px, pz] = [x * sx, z * sz];
    positions.set([rock.east + px * c - pz * s, y0 + y * sy,
      -rock.north + px * s + pz * c], i);
    const [nx, ny, nz] = [x / sx, y / sy, z / sz];
    const len = Math.hypot(nx, ny, nz) || 1;
    normals.set([(nx * c - nz * s) / len, ny / len, (nx * s + nz * c) / len],
      i);
  }
  return { positions, normals, index: STONE.index };
}

/** Every rock's stone, merged. */
export const stonesBuffers = (
  rocks: readonly Rock[],
  ground: GroundAt,
): MeshBuffers => merge(rocks.map((rock) => stone(rock, ground)));

/** Where a surface at `y` over the ground is shut in: 0.3 at the contact. */
const OPEN_M = 0.45;

/**
 * Baked ambient occlusion of `positions` (stones.ts' frame: x east, z
 * minus north): a vertex darkens as it nears the ground it sits on, so each
 * stone is grounded where the fill, not the Sun, lights it. RGB per vertex.
 */
export function contactAo(
  positions: Float32Array,
  ground: GroundAt,
): Float32Array {
  const colors = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = [positions[i] ?? 0, positions[i + 1] ?? 0,
      positions[i + 2] ?? 0];
    const open = Math.min(Math.max((y - ground(x, -z)) / OPEN_M, 0), 1);
    colors.fill(0.3 + 0.7 * open * open * (3 - 2 * open), i, i + 3);
  }
  return colors;
}
