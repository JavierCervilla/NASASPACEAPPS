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
 * The astronaut (VENT-34): NASA's «Astronaut» model with the insignia
 * covered (packages/web/models/astronaut.glb, ASSETS.md) and its suit
 * texture (astronaut-suit.webp, which the glb does not carry), loaded with
 * the scene only and read by glb.ts, as a physically based white suit and
 * a gold visor, 1.9 m tall, standing on the point in a soft contact
 * shadow. Third person shows it, facing where the view looks.
 */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  type Texture,
} from 'three';
import modelUrl from '../../../models/astronaut.glb?url';
import { readGlb, type GlbAccessor, type GlbPrimitive } from '../glb';
import { contactShadow } from './contact-shadow';
import { loadSuit, materialOf } from './suit';
import type { SunMask } from './sun-mask';

const HEIGHT_M = 1.9;
/** A vertex attribute over `a`. */
const attribute = (a: GlbAccessor): BufferAttribute =>
  new BufferAttribute(a.array, a.itemSize, a.normalized);

/** A mesh of `p`, its light masked near the point. */
function primitiveMesh(p: GlbPrimitive, i: number, suit: Texture,
  mask: SunMask): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(p.position));
  geometry.setAttribute('normal', attribute(p.normal));
  geometry.setAttribute('uv', attribute(p.uv));
  geometry.setIndex(attribute(p.index));
  const mesh = new Mesh(geometry, materialOf(i, suit, mask));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** The figure, scaled to its height and stood on its feet. */
function fitted(model: Group): Group {
  const box = new Box3().setFromObject(model);
  model.scale.multiplyScalar(HEIGHT_M / Math.max(box.max.y - box.min.y, 1e-6));
  model.updateMatrixWorld(true);
  const fit = new Box3().setFromObject(model);
  model.position.set(-(fit.min.x + fit.max.x) / 2, -fit.min.y,
    -(fit.min.z + fit.max.z) / 2);
  const holder = new Group();
  holder.add(model);
  return holder;
}

/** Loads the astronaut into `into`; resolves when it stands, or failed. */
export async function loadAstronaut(
  into: Group,
  mask: SunMask,
  warn: (message: string) => void,
): Promise<void> {
  try {
    const [response, suit] = await Promise.all([fetch(modelUrl), loadSuit()]);
    const glb = readGlb(await response.arrayBuffer());
    const model = new Group();
    glb.primitives.forEach((p, i) => model.add(primitiveMesh(p, i, suit,
      mask)));
    model.scale.setScalar(glb.scale);
    model.position.set(...glb.translation);
    const outer = new Group();
    outer.add(model);
    into.add(fitted(outer), contactShadow(0.95, 0.6));
  } catch (error) {
    warn(`Ventana Lunar: the astronaut did not load (${String(error)}).`);
  }
}
