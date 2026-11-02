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
 * What stands near the point (VENT-34): the illustrative rocks (rocks.ts,
 * stones.ts) as one mesh of rounded stones, kept clear of the lander
 * (lander.ts), and where that lander stands: beside where the view opens.
 */
import { BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { LANDER_RADIUS_M, type LanderKind } from '../lander-kind';
import { scatterRocks } from '../rocks';
import { contactAo, stonesBuffers, type GroundAt } from '../stones';
import { direction } from '../view-camera';
import { geometryOf } from './mesh-of';
import { maskSun, type SunMask } from './sun-mask';

/**
 * 22 m from the astronaut and 14° right of where the view opens, so the
 * lander is in the first frame on a phone's 30° of width too.
 */
const LANDER = { distanceM: 22, offsetDeg: 14 } as const;
/** Stones keep this far from the footpads' ring, metres. */
const ROCK_CLEARANCE_M = 2;

/** Where the lander stands, east and north of the astronaut. */
export function landerSpot(yawDeg: number): readonly [number, number] {
  const [x, , z] = direction(yawDeg + LANDER.offsetDeg, 0);
  return [x * LANDER.distanceM, -z * LANDER.distanceM];
}

function masked(color: number, mask: SunMask, roughness = 0.92) {
  const material = new MeshStandardMaterial({ color, roughness,
    metalness: 0 });
  maskSun(material, mask, false);
  return material;
}

/** The scatter of stones, clear of a lander of `kind` at `spot`. */
export function rocksMesh(
  seed: number,
  ground: GroundAt,
  lander: { readonly spot: readonly [number, number];
    readonly kind: LanderKind },
  mask: SunMask,
): Mesh {
  const { spot, kind } = lander;
  const clear = [{ east: spot[0], north: spot[1],
    r: LANDER_RADIUS_M[kind] + ROCK_CLEARANCE_M }];
  const rocks = scatterRocks(seed, { count: 420, innerM: 2.5,
    outerM: 120, clear });
  const buffers = stonesBuffers(rocks, ground);
  const geometry = geometryOf(buffers);
  geometry.setAttribute('color', new BufferAttribute(
    contactAo(buffers.positions, ground), 3));
  const material = masked(0xb4b1ab, mask);
  material.vertexColors = true;
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
