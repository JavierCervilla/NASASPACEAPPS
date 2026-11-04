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
 * Stand-ins for the ring meshes while the scene compiles (VENT-69): the
 * slicer builds the real ones as tiles land, long after, so two hidden
 * triangles wearing the ground material, one that receives shadows and one
 * that does not, make the programs of the near and the far rings, which
 * differ by that, with the attributes the ring meshes have.
 */
import { BufferAttribute, BufferGeometry, Mesh, type Scene } from 'three';
import type { World } from './world';

/** One hidden triangle of the ring meshes' attributes. */
function triangle(world: World, receiveShadow: boolean): Mesh {
  const geometry = new BufferGeometry();
  const attribute = (size: number): BufferAttribute =>
    new BufferAttribute(new Float32Array(3 * size), size);
  geometry.setAttribute('position', attribute(3));
  geometry.setAttribute('normal', attribute(3));
  geometry.setAttribute('uv', attribute(2));
  geometry.setAttribute('lit', attribute(1));
  const mesh = new Mesh(geometry, world.material);
  mesh.receiveShadow = receiveShadow;
  mesh.visible = false;
  return mesh;
}

/** Adds the stand-ins to `scene`; returns what removes and frees them. */
export function addWarmUp(scene: Scene, world: World): () => void {
  const meshes = [triangle(world, true), triangle(world, false)];
  scene.add(...meshes);
  return () => {
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
  };
}
