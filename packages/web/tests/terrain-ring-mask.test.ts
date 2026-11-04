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
 * Which cells a ring tile draws (VENT-66). A level's window is centred on the
 * site, so its edge, and the hole it leaves in the parent, falls on any cell
 * of the parent's lattice. The mask must follow the layout cell by cell: at
 * 8.07° N 38.41° W (the `latlon` scheme, recorded from production) it asked
 * once per block of 4 cells and left a 178 m strip of the ground undrawn on
 * the hole's far sides and drew a 118 m strip twice on its near ones.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { TILE_CELLS } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { parseTile } from '../src/terrain/ring/ring-answer';
import { cellOf } from '../src/terrain/ring/ring-cells';
import { unitOf } from '../src/terrain/ring/ring-frame';
import { drawn, type Layout } from '../src/terrain/ring/ring-layout';
import { drawnMask, type MeshSpec } from '../src/terrain/ring/ring-mask';
import { RingStore, type RingTile } from '../src/terrain/ring/ring-store';
import { windowsFor } from '../src/terrain/ring/ring-window';

const FIXTURES = new URL('../../../tests/e2e/fixtures/terrain-ring-oceanus/', import.meta.url);
const SITE = { lat: 8.07, lonEast: -38.41 };
const LEVELS = 4;

function fixtureTiles(): RingTile[] {
  const tiles: RingTile[] = [];
  for (const file of readdirSync(FIXTURES)) {
    const m = /^tile-latlon-(\d+)-(\d+)-(\d+)\.json$/.exec(file);
    if (!m) continue;
    const [level, x, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const body = JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8')) as unknown;
    const tile = parseTile(body, { level, x, y, url: '' }, 'latlon');
    if (tile) tiles.push(tile);
  }
  return tiles;
}

function layoutOf(tiles: RingTile[]): Layout {
  const store = new RingStore('latlon');
  for (const tile of tiles) store.add(tile);
  return { store, windows: windowsFor('latlon', unitOf(SITE.lat, SITE.lonEast), LEVELS) };
}

const specOf = (tile: RingTile, layout: Layout): MeshSpec => ({
  tile, layout, valid: new Uint8Array(TILE_CELLS * TILE_CELLS).fill(1), up: true, stride: 1, skirtM: 0,
});

describe('drawnMask on the recorded latlon relief', () => {
  it('draws each cell exactly when the layout does', () => {
    const tiles = fixtureTiles();
    const layout = layoutOf(tiles);
    const wrong: string[] = [];
    for (const tile of tiles) {
      const mask = drawnMask(specOf(tile, layout));
      for (let row = 0; row < TILE_CELLS; row++) {
        for (let col = 0; col < TILE_CELLS; col++) {
          const [cx, cy] = cellOf(tile.key, row, col);
          const want = drawn(layout, tile.key.level, cx, cy);
          if (Boolean(mask[row * TILE_CELLS + col]) !== want) wrong.push(`${tile.key.level}:${cx},${cy}`);
        }
      }
    }
    expect(wrong.length).toBe(0);
  }, 60_000);

  it.each([1, 2, 3])('draws every ground cell of level %i\'s window once, by it or by a finer level', (level) => {
    const tiles = fixtureTiles();
    const layout = layoutOf(tiles);
    const w = layout.windows[level];
    if (!w) throw new Error('no window');
    const sets = new Map<number, Set<string>>();
    for (const tile of tiles) {
      const set = sets.get(tile.key.level) ?? new Set<string>();
      sets.set(tile.key.level, set);
      const mask = drawnMask(specOf(tile, layout));
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        const [cx, cy] = cellOf(tile.key, Math.floor(i / TILE_CELLS), i % TILE_CELLS);
        set.add(`${cx},${cy}`);
      }
    }
    const below = (l: number, x: number, y: number): boolean =>
      l > 0 && (sets.get(l - 1)?.has(`${x * 4},${y * 4}`) === true || below(l - 1, x * 4, y * 4));
    let twice = 0;
    let never = 0;
    for (let cx = w.lo[0] * w.step; cx < w.hi[0] * w.step; cx++) {
      for (let cy = w.lo[1] * w.step; cy < w.hi[1] * w.step; cy++) {
        const coarse = sets.get(level)?.has(`${cx},${cy}`) ?? false;
        const under = below(level, cx, cy);
        if (coarse && under) twice++;
        if (!coarse && !under) never++;
      }
    }
    expect({ twice, never }).toEqual({ twice: 0, never: 0 });
  }, 60_000);
});
