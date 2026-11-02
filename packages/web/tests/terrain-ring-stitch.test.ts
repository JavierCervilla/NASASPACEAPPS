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
 * Level seams on REAL relief (VENT-46): the recorded IM-2 tiles (levels 0
 * to 2, `tests/e2e/fixtures/terrain-ring-im2/`) are read by different LOLA
 * tiers per level, so a fine node on its window's edge is not at the
 * parent's surface: metres apart. The crease metric is that gap, measured
 * on the placed nodes along the L1 to L2 boundary; stitching (ring-stitch.ts)
 * must close it, or the seam shows a step the skirts only hide.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { TILE_CELLS } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { parseTile } from '../src/terrain/ring/ring-answer';
import { cellOf } from '../src/terrain/ring/ring-cells';
import { frameAt, toLocal, unitOf } from '../src/terrain/ring/ring-frame';
import { gridPositions } from '../src/terrain/ring/ring-grid';
import { heightAtDir } from '../src/terrain/ring/ring-local';
import { RingStore } from '../src/terrain/ring/ring-store';
import { depthIn, windowsFor } from '../src/terrain/ring/ring-window';
import { sampleDirection, tileGeoref } from '@ventana/sim';

const FIXTURES = new URL('../../../tests/e2e/fixtures/terrain-ring-im2/', import.meta.url);
const SITE = { lat: -84.79, lonEast: 29.2 };
const LEVELS = 4;
const N = TILE_CELLS + 1;

function realStore(): RingStore {
  const store = new RingStore('polar-south');
  for (const file of readdirSync(FIXTURES)) {
    const m = /^tile-polar-south-(\d+)-(\d+)-(\d+)\.json$/.exec(file);
    if (!m) continue;
    const [level, x, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const body = JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8')) as unknown;
    const tile = parseTile(body, { level, x, y, url: '' }, 'polar-south');
    if (tile) store.add(tile);
  }
  return store;
}

/** The largest height gap, metres, between `level`'s nodes on its window's edge and the surface of `level + 1` there. */
function seamGap(level: number, stitched: boolean): { gap: number; nodes: number } {
  const store = realStore();
  const dir = unitOf(SITE.lat, SITE.lonEast);
  const windows = windowsFor('polar-south', dir, LEVELS);
  const frame = frameAt(SITE, heightAtDir(store, { from: 0, levels: LEVELS }, dir));
  let [gap, nodes] = [0, 0];
  for (const tile of store.tiles.values()) {
    if (tile.key.level !== level) continue;
    const context = { store, window: windows[level], levels: LEVELS };
    const positions = gridPositions(tile, frame, stitched ? context : undefined);
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const [cx, cy] = cellOf(tile.key, row, col);
        const window = windows[level];
        if (!window || depthIn(window, cx, cy + 1) !== 0) continue;
        const at = sampleDirection(tileGeoref(tile.key), row, col);
        const parent = heightAtDir(store, { from: level + 1, levels: LEVELS }, at);
        if (Number.isNaN(parent)) continue;
        gap = Math.max(gap, Math.abs((positions[(row * N + col) * 3 + 1] ?? 0) - toLocal(frame, at, parent)[1]));
        nodes++;
      }
    }
  }
  return { gap, nodes };
}

describe.each([[1, 2], [2, 3]])('the L%i to L%i seam on the recorded IM-2 relief', (level) => {
  it('has a step where the levels read different tiers (the crease, before stitching)', () => {
    const raw = seamGap(level, false);
    expect(raw.nodes).toBeGreaterThan(100);
    expect(raw.gap).toBeGreaterThan(0.5);
  });

  it('closes it: every node on the window edge lies on the parent surface', () => {
    const stitched = seamGap(level, true);
    expect(stitched.nodes).toBeGreaterThan(100);
    expect(stitched.gap).toBeLessThan(0.01);
  });
});

describe('a parent that arrives late', () => {
  it('places again only the stitched nodes when the parent arrives late, as a fresh placement would', () => {
    const full = realStore();
    const early = new RingStore('polar-south');
    for (const tile of full.tiles.values()) if (tile.key.level < 2) early.add(tile);
    const dir = unitOf(SITE.lat, SITE.lonEast);
    const window = windowsFor('polar-south', dir, LEVELS)[1];
    const frame = frameAt(SITE, 0);
    const tile = [...full.tiles.values()].find((t) => t.key.level === 1 && t.key.x === 9 && t.key.y === 17);
    if (!tile) throw new Error('fixture tile missing');
    const before = gridPositions(tile, frame, { store: early, window, levels: LEVELS });
    for (const t of full.tiles.values()) if (t.key.level === 2) early.add(t);
    const context = { store: early, window, levels: LEVELS };
    const again = gridPositions(tile, frame, context, before);
    expect(Array.from(again)).toEqual(Array.from(gridPositions(tile, frame, context)));
  });
});
