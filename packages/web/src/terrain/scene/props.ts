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
 * stones.ts) as one mesh of rounded stones, and the lander, a
 * placeholder (lander-shape.ts) until a licensed model is chosen (the
 * caption says so), on its four feet, beside where the view opens.
 */
import { BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { LANDER_FOOT_M, landerBuffers } from '../lander-shape';
import { scatterRocks } from '../rocks';
import { contactAo, stonesBuffers, type GroundAt } from '../stones';
import { direction } from '../view-camera';
import { contactShadow } from './contact-shadow';
import { geometryOf } from './mesh-of';
import { maskSun, type SunMask } from './sun-mask';

/** Where the lander stands: off the opening view's centre. */
const LANDER = { distanceM: 28, offsetDeg: 32 } as const;

/** The lander's spot, east and north, for a view opening on `yawDeg`. */
export function landerSpot(yawDeg: number): readonly [number, number] {
  const [x, , z] = direction(yawDeg + LANDER.offsetDeg, 0);
  return [x * LANDER.distanceM, -z * LANDER.distanceM];
}

/** A masked, physically based material of `color`. */
function masked(color: number, mask: SunMask, roughness = 0.92) {
  const material = new MeshStandardMaterial({ color, roughness,
    metalness: 0 });
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

/** The soft shadows under the pads, and a wide one under the body. */
function padShadows(): Mesh[] {
  const pads = [0, 1, 2, 3].map((i) => {
    const angle = (i + 0.5) * (Math.PI / 2);
    const shadow = contactShadow(0.95, 0.6);
    shadow.position.set(Math.sin(angle) * LANDER_FOOT_M, 0,
      Math.cos(angle) * LANDER_FOOT_M);
    return shadow;
  });
  return [...pads, contactShadow(3.4, 0.3)];
}

/** The placeholder lander at `spot`, its feet on `ground`. */
export function landerMesh(
  spot: readonly [number, number],
  ground: GroundAt,
  mask: SunMask,
): Group {
  const parts = landerBuffers();
  const lander = new Group();
  const looks = { body: [0xd8dadf, 0.5], foil: [0xc09a44, 0.3],
    dark: [0x3a3c42, 0.7] } as const;
  for (const key of ['body', 'foil', 'dark'] as const) {
    const mesh = new Mesh(geometryOf(parts[key]),
      masked(looks[key][0], mask, looks[key][1]));
    mesh.castShadow = mesh.receiveShadow = true;
    lander.add(mesh);
  }
  lander.add(...padShadows());
  lander.position.set(spot[0], ground(spot[0], spot[1]), -spot[1]);
  return lander;
}
