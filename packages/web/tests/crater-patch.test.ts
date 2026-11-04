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
 * The crater patch (VENT-64): where its scales of craters are drawn, the
 * mesh it makes, the craters' shadows and the layer that builds, lights and
 * shows it a few milliseconds at a time.
 */
import { Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { bakeRelief } from '../src/terrain/crater-relief';
import { createCraterUniforms } from '../src/terrain/scene/crater-depth';
import { CraterLayer } from '../src/terrain/scene/crater-layer';
import { buildPatch } from '../src/terrain/scene/crater-mesh';
import { craterLit, litJobs } from '../src/terrain/scene/crater-shade';
import {
  PATCH_SPECS,
  craterAt,
  patchRadii,
  scaleWeights,
  type PatchSpec,
  type Relief,
} from '../src/terrain/scene/crater-spec';
import { GRAIN_M } from '../src/terrain/scene/ring-geometry';
import type { Slicer } from '../src/terrain/scene/slicer';

const SMALL: PatchSpec = { n: 48, r: 10, minStep: 0.25, k: 0.02 };
const baked = (seed = 7): Float32Array => {
  const { field, jobs } = bakeRelief(seed);
  jobs.forEach((job) => job());
  return field;
};
const FLAT = (): number => 0;

describe('where the craters are drawn', () => {
  const high = PATCH_SPECS.high!;

  it('has a spec for high only, none for medium and low (the policy gates them)', () => {
    expect(high).not.toBeNull();
    expect(PATCH_SPECS.medium).toBeNull();
    expect(PATCH_SPECS.low).toBeNull();
  });

  it('keeps the triangles to a fifth of the view\'s half million on high', () => {
    const tris = (s: PatchSpec): number => (patchRadii(s).length + 1) * s.n * 2;
    expect(tris(high)).toBeLessThan(260_000);
  });

  it('has rings that grow from the eye to the radius', () => {
    const radii = patchRadii(high);
    expect(radii[0]).toBe(0);
    expect(radii[radii.length - 1]).toBe(high.r);
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeGreaterThan(radii[i - 1]!);
    }
  });

  it('draws the small scale near the eye and fades it first, then the large', () => {
    const [near0, near1] = scaleWeights(high, 1);
    expect(near0).toBe(1);
    expect(near1).toBe(1);
    const at = (r: number): [number, number] => scaleWeights(high, r);
    const goneSmall = [...Array(480).keys()].map((i) => (i + 1) / 10)
      .find((r) => at(r)[0] === 0)!;
    const goneLarge = [...Array(480).keys()].map((i) => (i + 1) / 10)
      .find((r) => at(r)[1] === 0)!;
    expect(goneSmall).toBeLessThan(goneLarge);
    expect(goneSmall).toBeGreaterThan(8);
    expect(goneLarge).toBeLessThanOrEqual(high.r);
  });

  it('fades smoothly to nothing at the radius, so the rings meet it level', () => {
    for (const spec of [high]) {
      expect(scaleWeights(spec, spec.r)).toEqual([0, 0]);
      let last = 2;
      for (let r = 0; r <= spec.r; r += 0.25) {
        const w = scaleWeights(spec, r);
        expect(w[0] + w[1]).toBeLessThanOrEqual(last);
        last = w[0] + w[1];
      }
      const before = scaleWeights(spec, spec.r - 0.5);
      expect(Math.abs(before[0] + before[1])).toBeLessThan(0.5);
    }
  });

  it('puts no relief where both scales are gone', () => {
    const rel: Relief = { h: baked(), spec: high };
    expect(craterAt(rel, high.r, 0)).toBe(0);
    expect(craterAt(rel, 0, high.r + 5)).toBe(0);
    expect(Math.abs(craterAt(rel, 1, 1))).toBeGreaterThan(0);
  });
});

describe('the patch mesh', () => {
  const rel: Relief = { h: baked(), spec: SMALL };
  const ground = (east: number, north: number): number => 0.01 * east + 3 + 0 * north;
  const patch = buildPatch(rel, ground);
  patch.jobs.forEach((job) => job());
  const geometry = patch.geometry;
  const pos = geometry.getAttribute('position').array as Float32Array;
  const rings = patchRadii(SMALL).length + 1;

  it('has a ring of vertices per radius and one more for the skirt', () => {
    expect(geometry.getAttribute('position').count).toBe(rings * SMALL.n);
    expect(geometry.index!.count).toBe((rings - 1) * SMALL.n * 6);
  });

  it('lies on the ground plus the craters, and hangs the skirt under the edge', () => {
    const ring = (j: number) => j * SMALL.n;
    for (const v of [ring(3), ring(5) + 7, ring(9) + 20]) {
      const [x, y, z] = [pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!];
      expect(y).toBeCloseTo(ground(x, -z) + craterAt(rel, x, z), 4);
    }
    const edge = (rings - 2) * SMALL.n;
    const skirt = (rings - 1) * SMALL.n;
    expect(pos[skirt * 3 + 1]).toBeCloseTo(pos[edge * 3 + 1]! - 0.4, 4);
  });

  it('carries unit normals, the regolith\'s coordinates, slopes and a lit of 1', () => {
    const normal = geometry.getAttribute('normal').array as Float32Array;
    const uv = geometry.getAttribute('uv').array as Float32Array;
    const slope = geometry.getAttribute('cslope').array as Float32Array;
    for (const v of [10, 100, 300]) {
      expect(Math.hypot(normal[v * 3]!, normal[v * 3 + 1]!, normal[v * 3 + 2]!)).toBeCloseTo(1, 5);
      expect(uv[v * 2]).toBeCloseTo(pos[v * 3]! / GRAIN_M, 5);
      expect(uv[v * 2 + 1]).toBeCloseTo(pos[v * 3 + 2]! / GRAIN_M, 5);
    }
    expect(slope.every(Number.isFinite)).toBe(true);
    expect(slope.some((s) => Math.abs(s) > 0.05)).toBe(true);
    expect((geometry.getAttribute('lit').array as Float32Array).every((l) => l === 1)).toBe(true);
  });

  it('fills in jobs of a few thousand vertices at most', () => {
    expect(buildPatch({ h: rel.h, spec: PATCH_SPECS.high! }, FLAT).jobs.length)
      .toBeGreaterThan(40);
  });
});

describe('the craters\' shadows', () => {
  const rel: Relief = { h: baked(), spec: PATCH_SPECS.high! };
  const sunAt = (elDeg: number) => ({ x: Math.cos(elDeg * Math.PI / 180), y: Math.sin(elDeg * Math.PI / 180), z: 0 });
  const shadowed = (elDeg: number): number => {
    let dark = 0;
    let n = 0;
    for (let x = -12; x < 12; x += 0.4) {
      for (let z = -12; z < 12; z += 0.4) {
        n++;
        if (craterLit(rel, { x, z, tilt: 0 }, sunAt(elDeg)) < 0.5) dark++;
      }
    }
    return dark / n;
  };

  it('casts none from the zenith and more the lower the Sun', () => {
    expect(craterLit(rel, { x: 1, z: 1, tilt: 0 }, { x: 0, y: 1, z: 0 })).toBe(1);
    const [a, b, c] = [40, 8, 3].map(shadowed);
    expect(a!).toBeLessThan(b!);
    expect(b!).toBeLessThan(c!);
    expect(a!).toBeLessThan(0.03);
    expect(c!).toBeGreaterThan(0.1);
  });

  it('shades only the Sun-side wall of a bowl, the far rim lit', () => {
    const h = new Float32Array(rel.h.length);
    const bowl: Relief = { h, spec: PATCH_SPECS.high! };
    const flat = craterLit(bowl, { x: 3, z: 0, tilt: 0 }, sunAt(10));
    expect(flat).toBe(1);
  });

  it('writes lit as the near ground\'s mask times the craters\' shadow', () => {
    const small: Relief = { h: rel.h, spec: SMALL };
    const made = buildPatch(small, FLAT);
    made.jobs.forEach((job) => job());
    const lit = made.geometry.getAttribute('lit').array as Float32Array;
    litJobs(made.geometry, small, sunAt(5), () => 0).forEach((job) => job());
    expect(lit.every((l) => l === 0)).toBe(true);
    litJobs(made.geometry, small, sunAt(5), () => 1).forEach((job) => job());
    expect(lit.some((l) => l === 1)).toBe(true);
    expect(lit.some((l) => l < 1)).toBe(true);
    litJobs(made.geometry, small, sunAt(90), () => 1).forEach((job) => job());
    expect(lit.every((l) => l === 1)).toBe(true);
  });
});

/** A slicer that waits to be drained, lowest priority first. */
function fakeSlicer(): Slicer & { drain: () => number; priorities: Set<number> } {
  const queue = new Map<string, { priority: number; job: () => void }>();
  const priorities = new Set<number>();
  return {
    priorities,
    add: (key, priority, job) => {
      priorities.add(priority);
      queue.set(key, { priority, job });
    },
    clear: () => queue.clear(),
    busy: () => queue.size > 0,
    drain: () => {
      let ran = 0;
      while (queue.size > 0) {
        const [key, next] = [...queue].sort((a, b) => a[1].priority - b[1].priority)[0]!;
        queue.delete(key);
        next.job();
        ran++;
      }
      return ran;
    },
  };
}

describe('the crater layer', () => {
  const sky = { sunAz: 90, sunEl: 5 };
  const make = () => {
    const slicer = fakeSlicer();
    const uniforms = createCraterUniforms();
    const notes: string[] = [];
    const layer = new CraterLayer({ seed: 3, spec: SMALL, uniforms, slicer,
      material: new MeshStandardMaterial(), note: (t) => notes.push(t) });
    return { slicer, uniforms, layer, notes };
  };

  it('bakes, builds hidden, then shows and cuts the rings only once lit', () => {
    const { slicer, uniforms, layer, notes } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    expect(layer.group.children).toHaveLength(0);
    slicer.drain();
    const patch = layer.group.children[0] as Mesh;
    expect(patch.name).toBe('crater-patch');
    expect(patch.receiveShadow).toBe(true);
    expect(patch.visible).toBe(true);
    expect(uniforms.uHoleR2.value).toBe(SMALL.r * SMALL.r);
    expect(notes).toEqual(['crater relief baked', 'crater patch built']);
  });

  // The ring's tiles have the priority of their level: the patch stands at the eye, so it waits for levels 0 and 1 and
  // not for the 32 and 128 km relief of levels 2 and 3 (which delayed it to 33 s on a software renderer).
  it('queues behind the near ground (ring levels 0 and 1) and ahead of the far levels', () => {
    const { slicer, layer } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    slicer.drain();
    expect(slicer.priorities.size).toBeGreaterThan(0);
    for (const priority of slicer.priorities) {
      expect(priority).toBeGreaterThan(1);
      expect(priority).toBeLessThan(2);
    }
  });

  it('builds no patch on the old point\'s ground, only on the new one\'s, once', () => {
    const { slicer, layer, notes } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    slicer.drain();
    layer.setGround(null, 4);
    slicer.drain();
    expect(notes.filter((t) => t === 'crater patch built')).toHaveLength(1);
    layer.setGround(() => 5);
    slicer.drain();
    expect(notes.filter((t) => t === 'crater patch built')).toHaveLength(2);
    expect(notes.filter((t) => t === 'crater relief baked')).toHaveLength(2);
  });

  it('keeps the patch hidden and the rings whole until the Sun is known', () => {
    const { slicer, uniforms, layer } = make();
    layer.setGround(FLAT);
    slicer.drain();
    expect((layer.group.children[0] as Mesh).visible).toBe(false);
    expect(uniforms.uHoleR2.value).toBe(-1);
    layer.relight(sky, null);
    slicer.drain();
    expect((layer.group.children[0] as Mesh).visible).toBe(true);
  });

  it('builds again on new ground, swapping the patch whole', () => {
    const { slicer, layer } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    slicer.drain();
    const first = layer.group.children[0];
    layer.setGround(() => 5);
    expect(layer.group.children[0]).toBe(first);
    slicer.drain();
    expect(layer.group.children).toHaveLength(1);
    expect(layer.group.children[0]).not.toBe(first);
  });

  it('frees the old patch and rebakes for another point (a new seed)', () => {
    const { slicer, uniforms, layer, notes } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    slicer.drain();
    const first = layer.group.children[0] as Mesh;
    let freed = 0;
    first.geometry.addEventListener('dispose', () => freed++);
    layer.setGround(FLAT, 4);
    expect(freed).toBe(1);
    expect(layer.group.children).toHaveLength(0);
    expect(uniforms.uHoleR2.value).toBe(-1);
    layer.relight(sky, null);
    slicer.drain();
    expect(layer.group.children).toHaveLength(1);
    expect(layer.group.children[0]).not.toBe(first);
    expect(notes.filter((t) => t === 'crater relief baked')).toHaveLength(2);
    layer.setGround(FLAT, 4);
    slicer.drain();
    expect(notes.filter((t) => t === 'crater relief baked')).toHaveLength(2);
  });

  it('queues its work again when the slicer was cleared under it', () => {
    const { slicer, layer } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    slicer.clear();
    layer.setGround();
    expect(slicer.drain()).toBeGreaterThan(5);
    expect(layer.group.children).toHaveLength(1);
  });

  it('stands what it carries on the craters, and nothing on no raster', () => {
    const { slicer, layer } = make();
    const before = layer.groundFor(() => 1);
    expect(before(1, 1)).toBe(1);
    layer.setGround(FLAT);
    slicer.drain();
    const on = layer.groundFor(() => 1);
    const rel: Relief = { h: baked(3), spec: SMALL };
    const [east, north] = [[1, 1], [2, 1], [3, -2], [-2, 2], [1, -3]]
      .find(([e, n]) => Math.abs(craterAt(rel, e!, -n!)) > 0.005)!;
    expect(on(east!, north!)).not.toBe(1);
    expect(on(east!, north!)).toBeCloseTo(1 + craterAt(rel, east!, -north!), 6);
  });

  it('does nothing after it is disposed, and takes the cut-out away', () => {
    const { slicer, uniforms, layer } = make();
    layer.setGround(FLAT);
    layer.relight(sky, null);
    slicer.drain();
    layer.dispose();
    expect(uniforms.uHoleR2.value).toBe(-1);
    expect(layer.group.parent).toBeNull();
  });
});
