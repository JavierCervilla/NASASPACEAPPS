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
 * Building a ring tile's mesh (VENT-46): place its nodes in the session's
 * frame, stitched to the parent's surface (once, and again when the parent
 * arrives), its normals (again when a neighbour arrives, so a seam
 * shows no crease), then the triangles of the cells the level draws now
 * with their skirts, and swap the geometry in, freeing the old one. The
 * state is what the layer keeps per tile and per level.
 */
import { Mesh, type BufferAttribute } from 'three';
import { nameOf } from '../ring/ring-cells';
import { gridPositions, facesUp } from '../ring/ring-grid';
import { buildMesh } from '../ring/ring-mesh';
import { gridNormals } from '../ring/ring-normals';
import { litReader, skirtOf, type Entry, type LayerState }
  from './ring-entry';
import { litOf, ringGeometry } from './ring-geometry';

/** Places the nodes and the normals of `entry` where they are missing. */
function place(
  s: LayerState,
  entry: Entry,
): { positions: Float32Array; normals: Float32Array } {
  const { view } = s;
  const level = entry.tile.key.level;
  const window = view.windows[level];
  const stitch = { store: view.store, window, levels: view.tier.levels };
  const again = entry.restitch && !entry.stale && entry.positions !== null;
  if (!entry.positions || entry.restitch) {
    entry.positions = gridPositions(entry.tile, view.frame, stitch,
      entry.positions ?? undefined);
    entry.up = facesUp(entry.positions);
  }
  if (entry.stale || !entry.normals || entry.restitch) {
    const blends = level < view.tier.levels - 1;
    const context = { store: view.store, frame: view.frame, window, blends,
      stitch };
    entry.normals = gridNormals(entry.tile, entry.positions, context,
      again ? entry.normals ?? undefined : undefined);
    entry.stale = entry.restitch = false;
  }
  return { positions: entry.positions, normals: entry.normals };
}

/** Builds (or rebuilds) the mesh of the tile `name`. */
export function rebuild(s: LayerState, name: string): void {
  const entry = s.entries.get(name);
  if (!entry) return;
  const base = place(s, entry);
  const { view } = s;
  const level = entry.tile.key.level;
  const spec = { tile: entry.tile, layout: view, valid: entry.valid,
    up: entry.up, stride: view.tier.strides[level] ?? 1,
    skirtM: skirtOf(level) };
  const buffers = buildMesh(spec, base);
  const geometry = ringGeometry(buffers, litOf(buffers.positions,
    litReader(s, level)));
  swap(s, entry, geometry, buffers.index.length > 0);
}

/** Puts `geometry` on the entry's mesh, making the mesh when it has none. */
function swap(
  s: LayerState,
  entry: Entry,
  geometry: ReturnType<typeof ringGeometry>,
  visible: boolean,
): void {
  if (!entry.mesh) {
    const mesh = new Mesh(geometry, s.material);
    const near = entry.tile.key.level === 0;
    mesh.castShadow = mesh.receiveShadow = near;
    mesh.name = nameOf(entry.tile.key);
    entry.mesh = mesh;
    s.group.add(mesh);
  } else {
    entry.mesh.geometry.dispose();
    entry.mesh.geometry = geometry;
  }
  entry.mesh.visible = visible;
}

/** Reads the new Sun's mask into the tile `name`'s geometry. */
export function refreshLit(s: LayerState, name: string): void {
  const entry = s.entries.get(name);
  const geometry = entry?.mesh?.geometry;
  if (!entry || !geometry) return;
  const position = geometry.getAttribute('position') as BufferAttribute;
  const lit = geometry.getAttribute('lit') as BufferAttribute;
  const read = litReader(s, entry.tile.key.level);
  (lit.array as Float32Array).set(litOf(position.array as Float32Array, read));
  lit.needsUpdate = true;
}
