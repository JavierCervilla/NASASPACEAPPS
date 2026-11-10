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
 * The relief rings in the scene (VENT-46): one mesh per tile in a group,
 * built a few milliseconds at a time as the tiles arrive (slicer.ts),
 * nearest level first. A tile arriving rebuilds itself, the neighbours of
 * its level (their normals and skirts meet it) and its parent tile (the
 * hole under it) and its children (their edges are stitched to
 * it); a level's Sun mask arriving updates the vertices' `lit`.
 * Everything made here is freed when the layer goes.
 */
import { Group, type Material, type MeshStandardMaterial } from 'three';
import { nameOf as nameFor, tileAt } from '../ring/ring-cells';
import type { RingView } from '../ring/ring-state';
import type { RingTile } from '../ring/ring-store';
import { entryOf, type LayerState, type LitGrid } from './ring-entry';
import { rebuild, refreshLit } from './ring-rebuild';
import { restitched } from './ring-restitch';
import type { Slicer } from './slicer';

export interface RingLayer {
  readonly group: Group;
  readonly view: RingView;
  /** Sets the Sun's mask of `level` (null: none). */
  readonly setLit: (level: number, grid: LitGrid | null) => void;
  readonly dispose: () => void;
}

/** Queues the rebuild of the tile `name`, finest level first. */
function queue(s: LayerState, name: string, level: number): void {
  s.slicer.add(name, level, () => rebuild(s, name));
}

/** Rebuilds what a new `tile` changes: itself, its neighbours, its parent. */
function touch(s: LayerState, tile: RingTile): void {
  const { scheme, level, x, y } = tile.key;
  const name = nameFor(tile.key);
  s.entries.set(name, entryOf(tile));
  queue(s, name, level);
  for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1]] as const) {
    const near = nameFor(tileAt(scheme, level, x + dx, y + dy));
    const entry = s.entries.get(near);
    if (!entry) continue;
    entry.stale = true;
    queue(s, near, level);
  }
  const parent = nameFor(tileAt(scheme, level + 1, Math.floor(x / 4),
    Math.floor(y / 4)));
  if (s.entries.has(parent)) queue(s, parent, level + 1);
  for (const [child, at] of restitched(s, tile)) queue(s, child, at);
}

/** Hangs `slicer` jobs that refresh the Sun's mask of `level`. */
function setLit(s: LayerState, level: number, grid: LitGrid | null): void {
  s.lits[level] = grid;
  for (const [name, entry] of s.entries) {
    if (entry.tile.key.level !== level) continue;
    s.slicer.add(`lit:${name}`, 100 + level, () => refreshLit(s, name));
  }
}

export interface RingOptions {
  /** Hears when a level builds its first mesh, for the crash report. */
  readonly note?: (text: string) => void;
  /** The shadow depth of the nearest level (the crater patch's cut-out). */
  readonly depth?: Material | null;
  /** Levels from FAR_FROM_LEVEL are drawn in the far pass (VENT-114). */
  readonly split?: boolean;
}

/** The layer for `view`, drawing with `material`; it adds nothing yet. */
export function createRingLayer(
  view: RingView,
  material: MeshStandardMaterial,
  slicer: Slicer,
  options: RingOptions = {},
): RingLayer {
  const s: LayerState = { view, material, slicer, group: new Group(),
    entries: new Map(), lits: [], built: new Set(),
    note: options.note ?? (() => undefined), depth: options.depth ?? null,
    split: options.split ?? false };
  s.group.name = 'ring';
  const known = [...view.store.tiles.values()];
  for (const tile of known.sort((a, b) => a.key.level - b.key.level)) {
    touch(s, tile);
  }
  const off = view.store.subscribe((tile) => touch(s, tile));
  const dispose = (): void => {
    off();
    for (const entry of s.entries.values()) entry.mesh?.geometry.dispose();
    s.group.removeFromParent();
  };
  return { group: s.group, view, setLit: (l, g) => setLit(s, l, g), dispose };
}
