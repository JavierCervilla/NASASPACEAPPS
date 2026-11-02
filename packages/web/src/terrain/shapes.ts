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
 * The shapes the on-foot scene draws besides the ground (VENT-34), as
 * plain buffers: a round stone, a tube between two points with its caps,
 * a flat disc, and the merge of many. Built here rather than with the
 * Three.js geometry classes, which would join the chunk the globe loads at
 * start; and pure, so a Web Worker can build them too.
 */
import type { Vec3 } from './view-camera';

export interface MeshBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly index: Uint32Array;
}

/** One buffer of many, their indices shifted. */
export function merge(parts: readonly MeshBuffers[]): MeshBuffers {
  const total = (key: keyof MeshBuffers) =>
    parts.reduce((n, p) => n + p[key].length, 0);
  const positions = new Float32Array(total('positions'));
  const normals = new Float32Array(total('normals'));
  const index = new Uint32Array(total('index'));
  let [v, i] = [0, 0];
  for (const p of parts) {
    positions.set(p.positions, v);
    normals.set(p.normals, v);
    index.set(p.index.map((k) => k + v / 3), i);
    [v, i] = [v + p.positions.length, i + p.index.length];
  }
  return { positions, normals, index };
}

/** A unit sphere of `around` x `rings` quads, poles included. */
export function sphere(around: number, rings: number): MeshBuffers {
  const positions: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI;
    for (let a = 0; a <= around; a++) {
      const theta = (a / around) * 2 * Math.PI;
      positions.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi),
        -Math.sin(phi) * Math.sin(theta));
      if (r < rings && a < around) {
        const k = r * (around + 1) + a;
        index.push(k, k + around + 1, k + 1, k + 1, k + around + 1,
          k + around + 2);
      }
    }
  }
  const p = Float32Array.from(positions);
  return { positions: p, normals: p.slice(), index: Uint32Array.from(index) };
}

/** Two unit vectors square to `d` and to each other. */
function basis([dx, dy, dz]: Vec3): [Vec3, Vec3] {
  const len = Math.hypot(dx, dy, dz) || 1;
  const d: Vec3 = [dx / len, dy / len, dz / len];
  const up: Vec3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u: Vec3 = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2],
    d[0] * up[1] - d[1] * up[0]];
  const ul = Math.hypot(...u);
  const un: Vec3 = [u[0] / ul, u[1] / ul, u[2] / ul];
  const v: Vec3 = [d[1] * un[2] - d[2] * un[1], d[2] * un[0] - d[0] * un[2],
    d[0] * un[1] - d[1] * un[0]];
  return [un, v];
}

export interface Tube {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radiusFrom: number;
  readonly radiusTo: number;
  readonly sides: number;
}

/**
 * A tube from `from` to `to`, its ends closed by a ring of triangles to
 * its axis; its sides face out. (A disc is a tube of no length.)
 */
export function tube(t: Tube): MeshBuffers {
  const axis: Vec3 = [t.to[0] - t.from[0], t.to[1] - t.from[1],
    t.to[2] - t.from[2]];
  const [u, v] = basis(axis);
  const positions: number[] = [...t.from, ...t.to];
  const normals: number[] = [0, -1, 0, 0, 1, 0];
  const index: number[] = [];
  for (let s = 0; s <= t.sides; s++) {
    const a = (s / t.sides) * 2 * Math.PI;
    const n = [0, 1, 2].map((c) =>
      (u[c] ?? 0) * Math.cos(a) + (v[c] ?? 0) * Math.sin(a));
    const ends = [[t.from, t.radiusFrom], [t.to, t.radiusTo]] as const;
    for (const [end, r] of ends) {
      positions.push(...end.map((e, c) => e + (n[c] ?? 0) * r));
      normals.push(...n);
    }
    if (s === t.sides) continue;
    const k = 2 + s * 2;
    index.push(k, k + 1, k + 2, k + 2, k + 1, k + 3, 0, k, k + 2,
      1, k + 3, k + 1);
  }
  return { positions: Float32Array.from(positions),
    normals: Float32Array.from(normals), index: Uint32Array.from(index) };
}
