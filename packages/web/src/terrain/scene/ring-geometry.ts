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
 * A ring tile's buffers as a Three.js geometry (VENT-46): position, normal,
 * the regolith's texture coordinates (metres over its tile size, as the
 * near ground had), and the Sun's mask `lit` per vertex, read from the
 * shadow grid of the tile's level (1 beyond the grid).
 */
import { BufferAttribute, BufferGeometry } from 'three';
import type { MeshBuffers } from '../ring/ring-mesh';

/** Metres one repeat of the regolith photograph covers (ground.ts). */
export const GRAIN_M = 3.5;

/** `lit` of every vertex of `positions` (x, y, z), read by `read(x, z)`. */
export function litOf(
  positions: Float32Array,
  read: (east: number, north: number) => number,
): Float32Array {
  const out = new Float32Array(positions.length / 3);
  for (let i = 0; i < out.length; i++) {
    out[i] = read(positions[i * 3] ?? 0, -(positions[i * 3 + 2] ?? 0));
  }
  return out;
}

/** The geometry of `buffers` with `lit`. */
export function ringGeometry(
  buffers: MeshBuffers,
  lit: Float32Array,
): BufferGeometry {
  const { positions, normals, index } = buffers;
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0; i < uv.length / 2; i++) {
    uv[i * 2] = (positions[i * 3] ?? 0) / GRAIN_M;
    uv[i * 2 + 1] = (positions[i * 3 + 2] ?? 0) / GRAIN_M;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('lit', new BufferAttribute(lit, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
