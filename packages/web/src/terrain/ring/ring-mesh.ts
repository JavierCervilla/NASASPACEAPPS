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
 * The triangles of a ring tile (VENT-46): only the cells the level draws
 * (ring-window.ts: inside its window, not under a finer level that is
 * loaded), every `stride`-th node, and a skirt on every side of a drawn cell
 * whose neighbour is not drawn, hung `skirtM` below the edge. A level seam
 * has T-junctions (4 fine nodes to 1 coarse) and a missing neighbour tile
 * has an open edge: the skirts close both, whichever side stands higher.
 * Pure: buffers a worker can build.
 */
import { TILE_CELLS } from '@ventana/sim';
import { drawnCells, drawnOutside, drawnMask, type MeshSpec } from './ring-mask';

const N = TILE_CELLS + 1;

export interface MeshBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly index: Uint32Array;
}

/** The sides of a cell whose neighbour is not drawn: node pairs. */
function openSides(s: MeshSpec, mask: Uint8Array, row: number, col: number) {
  const k = s.stride;
  const node = (r: number, c: number): number => r * N + c;
  const sides: [number, number, number, number][] = [
    [-k, 0, node(row, col), node(row, col + k)],
    [k, 0, node(row + k, col + k), node(row + k, col)],
    [0, -k, node(row + k, col), node(row, col)],
    [0, k, node(row, col + k), node(row + k, col + k)],
  ];
  const open = ([dr, dc]: number[]): boolean => {
    const [r, c] = [row + (dr ?? 0), col + (dc ?? 0)];
    const inside = r >= 0 && c >= 0 && r < TILE_CELLS && c < TILE_CELLS;
    return inside ? !mask[r * TILE_CELLS + c] : !drawnOutside(s, r, c);
  };
  return sides.filter(open).map(([, , a, b]) => [a, b]);
}

/** The cells' triangles, two each, facing up. */
function cellIndex(s: MeshSpec, cells: [number, number][]): number[] {
  const k = s.stride;
  const out: number[] = [];
  for (const [row, col] of cells) {
    const a = row * N + col;
    const [b, c, d] = [a + k, a + k * N, a + k * N + k];
    out.push(...(s.up ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
  }
  return out;
}

/** Adds a skirt under each node pair of `edges`; returns the new buffers. */
function withSkirts(
  base: { positions: Float32Array; normals: Float32Array },
  edges: number[][],
  skirtM: number,
): MeshBuffers & { skirtIndex: number[] } {
  const extra = edges.length * 2;
  const positions = new Float32Array(base.positions.length + extra * 3);
  const normals = new Float32Array(base.normals.length + extra * 3);
  positions.set(base.positions);
  normals.set(base.normals);
  const skirtIndex: number[] = [];
  edges.forEach(([a = 0, b = 0], e) => {
    const first = N * N + e * 2;
    for (const [slot, node] of [[first, a], [first + 1, b]] as const) {
      const from = node * 3;
      const [x = 0, y = 0, z = 0] = base.positions.subarray(from, from + 3);
      positions.set([x, y - skirtM, z], slot * 3);
      normals.set(base.normals.subarray(from, from + 3), slot * 3);
    }
    // Both windings: a skirt shows from whichever side the gap opens on.
    skirtIndex.push(a, first, b, b, first, first + 1,
      a, b, first, b, first + 1, first);
  });
  return { positions, normals, index: new Uint32Array(0), skirtIndex };
}

/** The tile's buffers: its drawn cells and the skirts of their open sides. */
export function buildMesh(
  s: MeshSpec,
  base: { positions: Float32Array; normals: Float32Array },
): MeshBuffers {
  const mask = drawnMask(s);
  const cells = drawnCells(s, mask);
  const edges = cells.flatMap(([row, col]) => openSides(s, mask, row, col));
  const withEdge = withSkirts(base, edges, s.skirtM);
  const index = Uint32Array.from(
    [...cellIndex(s, cells), ...withEdge.skirtIndex]);
  return { positions: withEdge.positions, normals: withEdge.normals, index };
}
