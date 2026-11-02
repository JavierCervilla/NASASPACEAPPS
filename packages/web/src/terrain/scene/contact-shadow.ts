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
 * A soft contact shadow (VENT-34): a flat quad of black, clear at its
 * edge, laid on the ground under what stands there, so the astronaut and
 * the lander's pads sit on the regolith when the fill, not the Sun, is
 * what lights it (ambient occlusion, drawn once: no pass, no idle frames).
 */
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
} from 'three';

const SIZE_PX = 64;
/** Lifted off the ground so it never z-fights the mesh under it, metres. */
const LIFT_M = 0.04;

/** A radial falloff, black with alpha 1 at the centre, 0 at the edge. */
function falloff(): DataTexture {
  const data = new Uint8Array(SIZE_PX * SIZE_PX * 4);
  for (let i = 0; i < SIZE_PX * SIZE_PX; i++) {
    const r = Math.hypot(((i % SIZE_PX) + 0.5) / SIZE_PX - 0.5,
      (Math.floor(i / SIZE_PX) + 0.5) / SIZE_PX - 0.5) * 2;
    const t = Math.min(Math.max(1 - r, 0), 1);
    data[i * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
  }
  const texture = new DataTexture(data, SIZE_PX, SIZE_PX);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** A square of side `2 * radius` facing up, with its UVs. */
function quad(radius: number): BufferGeometry {
  const r = radius;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(
    [-r, LIFT_M, -r, r, LIFT_M, -r, r, LIFT_M, r, -r, LIFT_M, r]), 3));
  geometry.setAttribute('uv', new BufferAttribute(
    new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  return geometry;
}

/** A contact shadow of `radius` metres and `opacity` at the origin. */
export function contactShadow(radius: number, opacity: number): Mesh {
  const material = new MeshBasicMaterial({ map: falloff(), color: 0x000000,
    transparent: true, opacity, depthWrite: false, polygonOffset: true,
    polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new Mesh(quad(radius), material);
  mesh.renderOrder = 1;
  return mesh;
}
