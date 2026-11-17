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
import type { Rock } from '../rocks';
import { measuredBands } from '../rocks-measured';
import { cellBands } from '../walk/rock-cells';
import { isAway, type EastNorth } from '../walk/walk-reach';
import { merge, type MeshBuffers } from '../shapes';
import { contactAo, stonesBuffers, type GroundAt } from '../stones';
import { geometryOf } from './mesh-of';
import type { Slicer } from './slicer';
import { maskSun, type SunMask } from './sun-mask';
import { scanSorter, type ScanRequest } from './rock-scans';

/** Behind the ring's tiles in the slicer's queue (lowest runs first). */
const PRIORITY = 100;

/** The stones cast the Sun's shadow and take it. */
const SHADOWED = { castShadow: true, receiveShadow: true };

/** The stones' mesh, empty and hidden until its bands are in. */
function hiddenStones(mask: SunMask): Mesh {
  const material = new MeshStandardMaterial({ color: 0xb4b1ab,
    roughness: 0.92, metalness: 0, vertexColors: true });
  maskSun(material, mask, false);
  const mesh = new Mesh(new BufferGeometry(), material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.visible = false;
  return mesh;
}

interface Part {
  readonly buffers: MeshBuffers;
  readonly ao: Float32Array;
}

/** The stones of `rocks` and their contact occlusion. */
function part(rocks: readonly Rock[], ground: GroundAt): Part {
  const buffers = stonesBuffers(rocks, ground);
  return { buffers, ao: contactAo(buffers.positions, ground) };
}

/** The stones' geometry once every band is in. */
function finished(parts: readonly Part[]): BufferGeometry {
  const geometry = geometryOf(merge(parts.map((p) => p.buffers)));
  const ao = new Float32Array(parts.reduce((n, p) => n + p.ao.length, 0));
  parts.reduce((at, p) => (ao.set(p.ao, at), at + p.ao.length), 0);
  geometry.setAttribute('color', new BufferAttribute(ao, 3));
  // The lumps move the vertices: the sphere's own normals no longer hold.
  geometry.computeVertexNormals();
  return geometry;
}

interface Scatter {
  readonly slicer: Slicer;
  readonly law: MeasuredScatter;
  /** Where the eye stands (VENT-121): away, the rocks of its cells. */
  readonly eye?: EastNorth | undefined;
  /** The nearest rocks as scans (VENT-124); null for today's stones. */
  readonly scan?: ScanRequest | null | undefined;
  /**
   * What each rock stands on (rock-ground.ts, VENT-124): the drawn ground;
   * absent, `ground`, which the scatter always reads.
   */
  readonly stand?: GroundAt | undefined;
}

/** The point's own bands at the point, the eye's cells' away from it. */
const bandsAround = (seed: number, ground: GroundAt, law: MeasuredScatter,
  eye: EastNorth) => (isAway(eye)
  ? cellBands(seed, ground, law, eye) : measuredBands(seed, ground, law));

/**
 * The scatter of stones of `seed` on `ground`: an empty hidden mesh now,
 * filled and shown when the slicer has run every band; `law` is the tier's
 * size law and cap (ground-policy.ts). At the point the point's own
 * scatter; away from it, the cells' around the eye (walk/rock-cells.ts).
 * With `scan` (VENT-124) the rocks nearest the eye are drawn as scanned
 * samples instead, a group under the stones' mesh (scene/rock-scans.ts),
 * or as stones there when the scans' files fail.
 */
export function rocksMesh(
  seed: number,
  ground: GroundAt,
  mask: SunMask,
  { slicer, law, eye = [0, 0], scan, stand = ground }: Scatter,
): Mesh {
  const mesh = hiddenStones(mask);
  const bands = bandsAround(seed, ground, law, eye);
  // Held rocks whose scans failed: stones, shadowed and lit as the others.
  const scans = scan ? scanSorter(eye, { request: scan, ground: stand, slicer,
    asStones: (rocks) => Object.assign(new Mesh(finished([part(rocks, stand)]),
      mesh.material), SHADOWED) }) : null;
  const parts: Part[] = [];
  for (let i = 0; i < bands.count; i++) {
    slicer.add(`rocks:${i}`, PRIORITY + i, () => {
      const band = bands.band(i);
      parts.push(part(scans ? scans.take(band) : band, stand));
      if (i < bands.count - 1) return;
      if (scans) parts.push(part(scans.finish(mesh), stand));
      mesh.geometry.dispose();
      mesh.geometry = finished(parts);
      mesh.visible = true;
    });
  }
  return mesh;
}
