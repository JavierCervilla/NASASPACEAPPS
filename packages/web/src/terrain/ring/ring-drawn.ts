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
 * The surface ring level 0 actually draws (VENT-124), for what stands on
 * it: the rocks. The near grid (ring-local.ts) is the rings resampled at
 * 15.6 m and read on its own triangles, while the drawn mesh joins every
 * `stride`-th lattice node (ring-mesh.ts: every second one at the medium
 * tier, 31 m cells). On IM-2's convex relief the two part by a median of
 * 5.5 cm and up to 25 cm within 15 m of the point at medium (3.6 and 9 cm
 * at every node), enough to bury rocks of 5 to 15 cm: placed on the near
 * grid they sank under the drawn ground. Here the spot's lattice cell is
 * found, its four nodes placed as the mesh places them (gridPositions:
 * the tile's sample direction and height, through the frame) and the
 * height read on the same two triangles the mesh draws. Pure.
 */
import { sampleDirection, tileGeoref } from '@ventana/sim';
import type { Vec3 } from '../view-camera';
import { fromLocal, toLocal, type Frame } from './ring-frame';
import { latticeOf } from './ring-lattice';
import { locate } from './ring-nodes';
import type { RingStore } from './ring-store';

/** The frame's y of the ground at a spot, metres east and north. */
export type GroundAt = (east: number, north: number) => number;

/** Where node `(gx, gy)` of level 0 is drawn; null when none holds it. */
function nodeAt(store: RingStore, frame: Frame, gx: number, gy: number) {
  const found = locate(store, 0, gx, gy);
  if (!found) return null;
  const { tile, row, col } = found;
  const h = tile.heights[row * tile.n + col] ?? Number.NaN;
  if (Number.isNaN(h)) return null;
  return toLocal(frame, sampleDirection(tileGeoref(tile.key), row, col), h);
}

/**
 * The height over triangle `[p, q, r]` (x east, z minus north) at `x`, `z`,
 * and whether the spot lies on the triangle's side of the cell's diagonal.
 */
function onTriangle(t: readonly Vec3[], x: number, z: number) {
  const [p = [0, 0, 0], q = [0, 0, 0], r = [0, 0, 0]] = t;
  const [ux, uz] = [q[0] - p[0], q[2] - p[2]];
  const [vx, vz] = [r[0] - p[0], r[2] - p[2]];
  const det = ux * vz - vx * uz;
  const u = ((x - p[0]) * vz - vx * (z - p[2])) / det;
  const v = (ux * (z - p[2]) - (x - p[0]) * uz) / det;
  const y = p[1] + u * (q[1] - p[1]) + v * (r[1] - p[1]);
  return { y, inside: u + v <= 1 };
}

/**
 * The drawn level 0 of `store` at `stride`, read through `frame`; where a
 * node is not loaded, `fallback` (the near grid). Node positions are kept,
 * since a rock's every vertex asks.
 */
export function drawnGround(
  ring: { readonly store: RingStore; readonly frame: Frame },
  stride: number,
  fallback: GroundAt,
): GroundAt {
  const { store, frame } = ring;
  const nodes = new Map<string, Vec3 | null>();
  const node = (gx: number, gy: number): Vec3 | null => {
    const key = `${gx},${gy}`;
    if (!nodes.has(key)) nodes.set(key, nodeAt(store, frame, gx, gy));
    return nodes.get(key) ?? null;
  };
  return (east, north) => {
    const dir = fromLocal(frame, east, north, frame.groundM);
    const [fx, fy] = latticeOf(store.scheme, 0, dir);
    const gx = Math.floor(fx / stride) * stride;
    const gy = Math.floor(fy / stride) * stride + stride;
    const [a, b, c, d] = [node(gx, gy), node(gx + stride, gy),
      node(gx, gy - stride), node(gx + stride, gy - stride)];
    if (!a || !b || !c || !d) return fallback(east, north);
    const first = onTriangle([a, b, c], east, -north);
    return first.inside ? first.y : onTriangle([d, c, b], east, -north).y;
  };
}
