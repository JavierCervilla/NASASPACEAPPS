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
 * stones.ts) as one mesh of rounded stones, and the lander, a clean
 * placeholder (lander-shape.ts) until a licensed model is chosen (the
 * caption says so), on its four feet, beside where the view opens.
 */
import { Group, Mesh, MeshLambertMaterial } from 'three';
import { LANDER_FOOT_M, landerBuffers } from '../lander-shape';
import { scatterRocks } from '../rocks';
import { stonesBuffers, type GroundAt } from '../stones';
import { direction } from '../view-camera';
import { geometryOf } from './mesh-of';
import { maskSun, type SunMask } from './sun-mask';

/** Where the lander stands: off the opening view's centre. */
const LANDER = { distanceM: 28, offsetDeg: 32 } as const;

/** The lander's spot, east and north, for a view opening on `yawDeg`. */
export function landerSpot(yawDeg: number): readonly [number, number] {
  const [x, , z] = direction(yawDeg + LANDER.offsetDeg, 0);
  return [x * LANDER.distanceM, -z * LANDER.distanceM];
}

/** A masked Lambert material of `color`. */
function masked(color: number, mask: SunMask): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color });
  maskSun(material, mask, false);
  return material;
}

/** The rocks of `seed` on `ground`, clear of the lander at `avoid`. */
export function rocksMesh(
  seed: number,
  ground: GroundAt,
  avoid: readonly [number, number],
  mask: SunMask,
): Mesh {
  const clear = [{ east: avoid[0], north: avoid[1], r: LANDER_FOOT_M + 2 }];
  const rocks = scatterRocks(seed, { count: 420, innerM: 2.5,
    outerM: 120, clear });
  const mesh = new Mesh(geometryOf(stonesBuffers(rocks, ground)),
    masked(0xa6a39e, mask));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** The placeholder lander at `spot`, its feet on `ground`. */
export function landerMesh(
  spot: readonly [number, number],
  ground: GroundAt,
  mask: SunMask,
): Group {
  const parts = landerBuffers();
  const lander = new Group();
  const colours = { body: 0xc9ccd2, foil: 0xa8843c, dark: 0x2c2e33 };
  for (const key of ['body', 'foil', 'dark'] as const) {
    const mesh = new Mesh(geometryOf(parts[key]), masked(colours[key], mask));
    mesh.castShadow = mesh.receiveShadow = true;
    lander.add(mesh);
  }
  lander.position.set(spot[0], ground(spot[0], spot[1]), -spot[1]);
  return lander;
}
