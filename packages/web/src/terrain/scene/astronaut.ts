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
 * covered (packages/web/models/astronaut.glb, ASSETS.md), loaded with the
 * scene only and read by glb.ts, 1.9 m tall, standing on the point. Third
 * person shows it, facing where the view looks.
 */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
} from 'three';
import modelUrl from '../../../models/astronaut.glb?url';
import { readGlb, type GlbAccessor, type GlbPrimitive } from '../glb';
import { maskSun, type SunMask } from './sun-mask';

const HEIGHT_M = 1.9;
/**
 * The white suit's own lift, a share of its colour: it reads as a lit white
 * suit against the dark ground even with the Sun grazing (shadows lifted
 * for legibility, as the caption says).
 */
const SELF_FILL = 0.3;

/** A vertex attribute over `a`. */
const attribute = (a: GlbAccessor): BufferAttribute =>
  new BufferAttribute(a.array, a.itemSize, a.normalized);

/** A mesh of `p`, its light masked near the point. */
function primitiveMesh(p: GlbPrimitive, mask: SunMask): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(p.position));
  geometry.setAttribute('normal', attribute(p.normal));
  geometry.setIndex(attribute(p.index));
  // Lambert, as the globe: no new material class joins the shared chunk.
  const material = new MeshLambertMaterial();
  material.color.setRGB(...p.color);
  material.emissive.setRGB(...p.color).multiplyScalar(SELF_FILL);
  maskSun(material, mask, false);
  const mesh = new Mesh(geometry, material);
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
    const response = await fetch(modelUrl);
    const glb = readGlb(await response.arrayBuffer());
    const model = new Group();
    for (const p of glb.primitives) model.add(primitiveMesh(p, mask));
    model.scale.setScalar(glb.scale);
    model.position.set(...glb.translation);
    const outer = new Group();
    outer.add(model);
    into.add(fitted(outer));
  } catch (error) {
    warn(`Ventana Lunar: the astronaut did not load (${String(error)}).`);
  }
}
