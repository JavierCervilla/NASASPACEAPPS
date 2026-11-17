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
 * The scanned rocks when their files fail (VENT-127, VENT-124's fix
 * forward): the held nearest rocks are built as the usual stones in a
 * slicer job, casting shadows like the others, a file with no shape is a
 * failed load, and the scene's load reaches the panel so the caption stops
 * crediting the scans.
 */
import { InstancedMesh, Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { sceneHooks } from '../src/components/terrain/scene-hooks';
import { MEASURED } from '../src/terrain/rock-law';
import { SCAN_MAGIC, readScanShapes } from '../src/terrain/scan-rock-file';
import { rocksMesh } from '../src/terrain/scene/props';
import type { ScanAssets } from '../src/terrain/scene/scan-rocks';
import type { Slicer } from '../src/terrain/scene/slicer';
import { createSunMask } from '../src/terrain/scene/sun-mask';
import type { ViewTier } from '../src/terrain/view-tier';

/** A slicer that runs nothing until asked, and the keys it was given. */
function held() {
  const jobs: (() => void)[] = [];
  const keys: string[] = [];
  const slicer: Slicer = { add: (key, _p, run) => (keys.push(key), void jobs.push(run)),
    clear: () => undefined, busy: () => jobs.length > 0 };
  return { slicer, keys, runAll: () => { while (jobs.length) jobs.shift()?.(); } };
}

/** Every plain (not instanced) mesh under and including `root`. */
const meshes = (root: Object3D): Mesh[] => {
  const out: Mesh[] = [];
  root.traverse((o) => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) out.push(o); });
  return out;
};

const vertices = (root: Object3D): number =>
  meshes(root).reduce((n, m) => n + m.geometry.getAttribute('position').count, 0);

/** The stones' mesh of seed 7 on flat ground, with scans whose files come as `assets`. */
async function scattered(assets: Promise<ScanAssets> | null) {
  const { slicer, keys, runAll } = held();
  const mesh = rocksMesh(7, () => 0, createSunMask(), { slicer, law: MEASURED,
    scan: assets ? { look: 'scan', assets } : null });
  runAll();
  await new Promise((settled) => setTimeout(settled, 0));
  runAll();
  return { mesh, keys };
}

describe('scanned rocks whose files fail', () => {
  it('builds the held nearest rocks as stones, so every rock is drawn', async () => {
    const stones = await scattered(null);
    const failed = await scattered(Promise.reject(new Error('refused')));
    expect(vertices(failed.mesh)).toBe(vertices(stones.mesh));
    expect(meshes(failed.mesh)).toHaveLength(2);
    expect(failed.keys).toContain('rocks:stones');
  });

  it('casts and takes the Sun\'s shadow and wears the stones\' material', async () => {
    const { mesh } = await scattered(Promise.reject(new Error('refused')));
    const fallback = meshes(mesh).find((m) => m !== mesh);
    expect(fallback?.castShadow).toBe(true);
    expect(fallback?.receiveShadow).toBe(true);
    expect(fallback?.material).toBe(mesh.material);
  });

  it('builds no stone in their place while the files are still coming', async () => {
    const { mesh, keys } = await scattered(new Promise<ScanAssets>(() => undefined));
    expect(meshes(mesh)).toHaveLength(1);
    expect(keys).not.toContain('rocks:stones');
  });
});

describe('a scans file with no shape', () => {
  it('is a failed load, not an empty scatter', () => {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setUint32(0, SCAN_MAGIC, true);
    expect(() => readScanShapes(buffer)).toThrow(/no shape/);
  });
});

describe('the scans\' load reaches the panel', () => {
  it('hands the panel\'s own setter to the scene', () => {
    const heard: boolean[] = [];
    const onScans = (loaded: boolean) => void heard.push(loaded);
    const tier = { get: () => ({ tier: 'medium', steppable: false }) } as unknown as ViewTier;
    const hooks = sceneHooks({ panel: { current: { onLook: () => undefined, onScans } }, tier,
      report: { step: () => undefined }, onLost: () => undefined, onDrawn: () => undefined });
    hooks.onScans?.(false);
    expect(heard).toEqual([false]);
  });
});
