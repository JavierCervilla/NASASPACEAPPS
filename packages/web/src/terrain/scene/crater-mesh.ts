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
 * The crater patch's geometry (VENT-64): the vertices of crater-spec.ts's
 * polar rings on the ground plus the craters' relief, built in jobs of a
 * few milliseconds for the slicer. Each vertex carries its position, the
 * ground's own normal, the regolith's texture coordinates, the craters'
 * slope (`cslope`, the shader adds it to the normal so the NAC slope of
 * the fine relief, which replaces the mesh's, does not eat it) and the
 * Sun's mask `lit`. One more ring hangs below the edge as a skirt, so a
 * height mismatch with the rings' ground shows no gap. Not pure: three's
 * buffers.
 */
import { BufferAttribute, BufferGeometry } from 'three';
import { craterAt, patchRadii, type Relief } from './crater-spec';
import { GRAIN_M } from './ring-geometry';

/** The ground's height at east, north (world.ground). */
export type GroundAt = (east: number, north: number) => number;

/** Step of the central differences of the slopes, metres. */
const SLOPE_STEP_M = 0.01;
const NORMAL_STEP_M = 0.5;
/** How far the skirt hangs under the edge, metres. */
const SKIRT_M = 0.4;
/** Vertices a job fills: a few milliseconds. */
const JOB_VERTICES = 1800;

export interface Patch {
  readonly geometry: BufferGeometry;
  /** Jobs that fill the buffers, a few ms each. */
  readonly jobs: (() => void)[];
}

interface Buffers {
  readonly position: Float32Array;
  readonly normal: Float32Array;
  readonly uv: Float32Array;
  readonly slope: Float32Array;
}

/** The index of the patch's triangles: `rings` rings of `n` vertices. */
function patchIndex(rings: number, n: number): Uint32Array {
  const index = new Uint32Array((rings - 1) * n * 6);
  let o = 0;
  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n;
      const [a, b] = [j * n + i, j * n + i1];
      index.set([a, b, a + n, b, b + n, a + n], o);
      o += 6;
    }
  }
  return index;
}

/** Fills vertex `at` at world `x`, `z`, on the skirt or not. */
function fillVertex(
  b: Buffers,
  rel: Relief,
  ground: GroundAt,
  at: { v: number; x: number; z: number; skirt: boolean },
): void {
  const { v, x, z } = at;
  const e = NORMAL_STEP_M;
  const y = ground(x, -z) + craterAt(rel, x, z) - (at.skirt ? SKIRT_M : 0);
  b.position.set([x, y, z], v * 3);
  const gx = ground(x + e, -z) - ground(x - e, -z);
  const gz = ground(x, -z - e) - ground(x, -z + e);
  const l = Math.hypot(gx, e * 2, gz);
  b.normal.set([-gx / l, (e * 2) / l, -gz / l], v * 3);
  b.uv.set([x / GRAIN_M, z / GRAIN_M], v * 2);
  const d = SLOPE_STEP_M;
  b.slope.set([(craterAt(rel, x + d, z) - craterAt(rel, x - d, z)) / (2 * d),
    (craterAt(rel, x, z + d) - craterAt(rel, x, z - d)) / (2 * d)], v * 2);
}

/** The geometry holding `b`, `lit` all 1, and the triangles of the rings. */
function patchGeometry(b: Buffers, rings: number, n: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(b.position, 3));
  geometry.setAttribute('normal', new BufferAttribute(b.normal, 3));
  geometry.setAttribute('uv', new BufferAttribute(b.uv, 2));
  geometry.setAttribute('cslope', new BufferAttribute(b.slope, 2));
  geometry.setAttribute('lit',
    new BufferAttribute(new Float32Array(rings * n).fill(1), 1));
  geometry.setIndex(new BufferAttribute(patchIndex(rings, n), 1));
  return geometry;
}

/** The patch of `rel` on `ground`: an empty geometry and its jobs. */
export function buildPatch(rel: Relief, ground: GroundAt): Patch {
  const { spec } = rel;
  const radii = patchRadii(spec);
  const rings = radii.length + 1;
  const count = rings * spec.n;
  const b: Buffers = { position: new Float32Array(count * 3),
    normal: new Float32Array(count * 3), uv: new Float32Array(count * 2),
    slope: new Float32Array(count * 2) };
  const jobs: (() => void)[] = [];
  for (let from = 0; from < count; from += JOB_VERTICES) {
    jobs.push(() => {
      for (let v = from; v < Math.min(count, from + JOB_VERTICES); v++) {
        const [j, i] = [Math.floor(v / spec.n), v % spec.n];
        const r = radii[Math.min(j, radii.length - 1)] ?? 0;
        const a = (i / spec.n) * Math.PI * 2;
        fillVertex(b, rel, ground, { v, x: r * Math.cos(a),
          z: r * Math.sin(a), skirt: j === radii.length });
      }
    });
  }
  return { geometry: patchGeometry(b, rings, spec.n), jobs };
}
