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
 * What the ring layer keeps per tile and per level (VENT-46): the entry of
 * a tile (its placed nodes, normals and mesh), the Sun's shadow grid of a
 * level and the reader that gives a vertex its mask.
 */
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { validCells } from '../ring/ring-grid';
import type { RingView } from '../ring/ring-state';
import type { RingTile } from '../ring/ring-store';
import { readGrid } from '../ring/ring-read';
import type { Slicer } from './slicer';

export interface Entry {
  readonly tile: RingTile;
  readonly valid: Uint8Array;
  positions: Float32Array | null;
  normals: Float32Array | null;
  up: boolean;
  /** The normals need computing again: a neighbour arrived. */
  stale: boolean;
  /** The parent arrived: only the nodes near the window's edge change. */
  restitch: boolean;
  mesh: Mesh | null;
}

/** The Sun's shadow of one level: a grid of 0 and 1 over `sizeM`. */
export interface LitGrid {
  readonly lit: Float32Array;
  readonly sizeM: number;
}

export interface LayerState {
  readonly view: RingView;
  readonly material: MeshStandardMaterial;
  readonly group: Group;
  readonly slicer: Slicer;
  readonly entries: Map<string, Entry>;
  readonly lits: (LitGrid | null)[];
  /** The levels that have drawn a mesh, and where the layer says so. */
  readonly built: Set<number>;
  readonly note: (text: string) => void;
}

/** The skirt of a level: most of the next level's node spacing, metres. */
export const skirtOf = (level: number): number =>
  0.6 * 15.625 * 4 ** (level + 1);

/** A new entry for `tile`. */
export const entryOf = (tile: RingTile): Entry => ({ tile,
  valid: validCells(tile), positions: null, normals: null, up: true,
  stale: true, restitch: false, mesh: null });

/** What `level`'s vertices read for the Sun's mask: its grid, else 1. */
export function litReader(s: LayerState, level: number) {
  const grid = s.lits[level];
  return (east: number, north: number): number => grid
    ? readGrid(grid.lit, grid.sizeM, [east, north], 1) : 1;
}

