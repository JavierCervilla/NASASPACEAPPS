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
 * What stands near the point (VENT-34, VENT-62): the rocks by a measured
 * size law (rocks-measured.ts, stones.ts) as one mesh of lumpy stones, partly
 * buried, denser where the real near ground is steep or convex. The work is
 * split in diameter bands run by the slicer, a few milliseconds each (the
 * whole at once took about 50 ms), and the mesh shows when the last band
 * has merged.
 */
import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { MeasuredScatter } from '../rock-law';
import { measuredBands } from '../rocks-measured';
import { merge, type MeshBuffers } from '../shapes';
import { contactAo, stonesBuffers, type GroundAt } from '../stones';
import { geometryOf } from './mesh-of';
import type { Slicer } from './slicer';
import { maskSun, type SunMask } from './sun-mask';

/** Behind the ring's tiles in the slicer's queue (lowest runs first). */
const PRIORITY = 100;

function masked(color: number, mask: SunMask, roughness = 0.92) {
  const material = new MeshStandardMaterial({ color, roughness,
    metalness: 0 });
  maskSun(material, mask, false);
  return material;
}

interface Part {
  readonly buffers: MeshBuffers;
  readonly ao: Float32Array;
}

/** The parts' contact occlusion, one array. */
function joined(parts: readonly Part[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.ao.length, 0));
  parts.reduce((at, p) => (out.set(p.ao, at), at + p.ao.length), 0);
  return out;
}

/** The stones' geometry once every band is in. */
function finished(parts: readonly Part[]): BufferGeometry {
  const geometry = geometryOf(merge(parts.map((p) => p.buffers)));
  geometry.setAttribute('color', new BufferAttribute(joined(parts), 3));
  // The lumps move the vertices: the sphere's own normals no longer hold.
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The scatter of stones of `seed` on `ground`: an empty hidden mesh now,
 * filled and shown when the slicer has run every band; `law` is the tier's
 * size law and cap (ground-policy.ts).
 */
export function rocksMesh(
  seed: number,
  ground: GroundAt,
  mask: SunMask,
  { slicer, law }: { readonly slicer: Slicer; readonly law: MeasuredScatter },
): Mesh {
  const material = masked(0xb4b1ab, mask);
  material.vertexColors = true;
  const mesh = new Mesh(new BufferGeometry(), material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.visible = false;
  const bands = measuredBands(seed, ground, law);
  const parts: Part[] = [];
  for (let i = 0; i < bands.count; i++) {
    slicer.add(`rocks:${i}`, PRIORITY + i, () => {
      const buffers = stonesBuffers(bands.band(i), ground);
      parts.push({ buffers, ao: contactAo(buffers.positions, ground) });
      if (i < bands.count - 1) return;
      mesh.geometry.dispose();
      mesh.geometry = finished(parts);
      mesh.visible = true;
    });
  }
  return mesh;
}
