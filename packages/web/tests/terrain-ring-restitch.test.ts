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
 * The scene wiring of a late parent (VENT-46): a fine tile lands first, then
 * the parent it was placed without. `createRingLayer` must place the child's
 * edge band again, onto the parent's surface (ring-restitch.ts marks it,
 * ring-rebuild.ts places it). The pure `gridPositions` is held by
 * terrain-ring-stitch.test.ts; this holds the wiring that calls it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { MeshStandardMaterial, type BufferAttribute, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { parseTile } from '../src/terrain/ring/ring-answer';
import { nameOf } from '../src/terrain/ring/ring-cells';
import { frameAt, unitOf } from '../src/terrain/ring/ring-frame';
import { ringTier } from '../src/terrain/ring/ring-plan';
import type { RingView } from '../src/terrain/ring/ring-state';
import { RingStore, type RingTile } from '../src/terrain/ring/ring-store';
import { windowsFor } from '../src/terrain/ring/ring-window';
import { createRingLayer } from '../src/terrain/scene/ring-layer';
import type { Slicer } from '../src/terrain/scene/slicer';

const FIXTURES = new URL('../../../tests/e2e/fixtures/terrain-ring-im2/', import.meta.url);
const SITE = { lat: -84.79, lonEast: 29.2 };
/** On the window edge: its cells 276 to 288 lie in the stitch band. */
const CHILD = { level: 1, x: 8, y: 17 };
const PARENT_LEVEL = 2;

function fixtureTiles(): RingTile[] {
  const tiles: RingTile[] = [];
  for (const file of readdirSync(FIXTURES)) {
    const m = /^tile-polar-south-(\d+)-(\d+)-(\d+)\.json$/.exec(file);
    if (!m) continue;
    const [level, x, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const body = JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8')) as unknown;
    const tile = parseTile(body, { level, x, y, url: '' }, 'polar-south');
    if (tile) tiles.push(tile);
  }
  return tiles;
}

/** A slicer whose jobs run when the test says so. */
function manualSlicer(): Slicer & { flush: () => void } {
  const jobs = new Map<string, () => void>();
  return {
    add: (key, _priority, job) => void jobs.set(key, job),
    clear: () => jobs.clear(),
    busy: () => jobs.size > 0,
    flush() {
      while (jobs.size > 0) {
        const [key, job] = jobs.entries().next().value as [string, () => void];
        jobs.delete(key);
        job();
      }
    },
  };
}

function rig(early: RingTile[]) {
  const store = new RingStore('polar-south');
  for (const tile of early) store.add(tile);
  const tier = ringTier('high');
  const windows = windowsFor('polar-south', unitOf(SITE.lat, SITE.lonEast), tier.levels);
  const view = { store, frame: frameAt(SITE, 0), windows, tier } as unknown as RingView;
  const slicer = manualSlicer();
  const layer = createRingLayer(view, new MeshStandardMaterial(), slicer);
  slicer.flush();
  const childPositions = (): Float32Array => {
    const name = nameOf({ scheme: 'polar-south', ...CHILD });
    const mesh = layer.group.getObjectByName(name) as Mesh | undefined;
    if (!mesh) throw new Error('child mesh missing');
    return Float32Array.from((mesh.geometry.getAttribute('position') as BufferAttribute).array);
  };
  return { store, slicer, childPositions };
}

describe('the ring layer when the parent arrives after the child', () => {
  it('places the child’s edge band again, onto the parent’s surface', () => {
    const tiles = fixtureTiles();
    const parents = tiles.filter((t) => t.key.level === PARENT_LEVEL);
    const early = rig(tiles.filter((t) => t.key.level < PARENT_LEVEL));
    const before = early.childPositions();

    for (const tile of parents) early.store.add(tile);
    early.slicer.flush();
    const after = early.childPositions();

    const fresh = rig(tiles).childPositions();
    expect(after.length).toBe(before.length);
    let moved = 0;
    for (let i = 1; i < after.length; i += 3) {
      moved = Math.max(moved, Math.abs((after[i] ?? 0) - (before[i] ?? 0)));
    }
    expect(moved).toBeGreaterThan(0.5);
    let off = 0;
    for (let i = 0; i < after.length; i++) {
      off = Math.max(off, Math.abs((after[i] ?? 0) - (fresh[i] ?? 0)));
    }
    expect(off).toBeLessThan(0.01);
  }, 60_000);
});
