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
 * The crater layer's work (VENT-64): the raster's bake, the patch's build
 * and its shading, each queued on the slicer in jobs of a few milliseconds.
 * Jobs of an older build or light see a newer generation and do nothing.
 */
import { Mesh } from 'three';
import type { Group, MeshStandardMaterial } from 'three';
import { bakeRelief } from '../crater-relief';
import { readGrid } from '../ring/ring-read';
import type { CraterUniforms } from './crater-glsl';
import { buildPatch, type GroundAt } from './crater-mesh';
import { litJobs, type SunDir } from './crater-shade';
import type { PatchSpec, Relief } from './crater-spec';
import type { Slicer } from './slicer';

/**
 * Right behind the near ground (ring levels 0 and 1, whose tiles have the
 * priority of their level) and before the far levels 2 and 3, the far
 * shading and the rocks: the patch stands at the eye, so it must not wait
 * for the 32 and 128 km relief (slicer priorities, lowest first).
 */
const BAKE_PRIORITY = 1.2;
const BUILD_PRIORITY = 1.3;
const LIT_PRIORITY = 1.5;

export interface CraterDeps {
  readonly seed: number;
  readonly spec: PatchSpec;
  /** The cut-out the patch makes in the rings' ground, set when it shows. */
  readonly uniforms: CraterUniforms;
  /** The patch's material (the rings' is another variant of it). */
  readonly material: MeshStandardMaterial;
  readonly slicer: Slicer;
  /** Notes a step for the crash report. */
  readonly note: (text: string) => void;
}

export interface SkyAt {
  readonly sunAz: number;
  readonly sunEl: number;
}

export interface State {
  field: Float32Array | null;
  ground: GroundAt | null;
  ringLit: { lit: Float32Array; sizeM: number } | null;
  sun: SunDir | null;
  patch: Mesh | null;
  /** Counts builds and lights, so an older job knows it is stale. */
  build: number;
  light: number;
  baking: boolean;
}

/** Queues `jobs` under `key`, each running only while `alive()`. */
function queue(
  slicer: Slicer,
  key: { name: string; priority: number },
  jobs: readonly (() => void)[],
  alive: () => boolean,
): void {
  jobs.forEach((job, i) => {
    slicer.add(`${key.name}:${i}`, key.priority,
      () => { if (alive()) job(); }, true);
  });
}

/**
 * Shades the patch for the Sun and the near ground's mask, then shows it
 * (and cuts its disc out of the rings): a patch drawn before its shadows
 * would light every crater.
 */
export function lightPatch(s: State, deps: CraterDeps, rel: Relief): void {
  const patch = s.patch;
  if (!patch || !s.sun) return;
  const ring = s.ringLit;
  const ringAt = (east: number, north: number): number =>
    ring ? readGrid(ring.lit, ring.sizeM, [east, north], 1) : 1;
  const id = ++s.light;
  const show = (): void => {
    patch.visible = true;
    deps.uniforms.uHoleR2.value = deps.spec.r * deps.spec.r;
  };
  const jobs = [...litJobs(patch.geometry, rel, s.sun, ringAt), show];
  queue(deps.slicer, { name: 'crater:lit', priority: LIT_PRIORITY }, jobs,
    () => id === s.light);
}

/** Builds the patch on the ground, and swaps it in when it is whole. */
export function startBuild(s: State, deps: CraterDeps, group: Group): void {
  if (!s.field || !s.ground) return;
  const rel: Relief = { h: s.field, spec: deps.spec };
  const made = buildPatch(rel, s.ground);
  const id = ++s.build;
  const swap = (): void => {
    s.patch?.geometry.dispose();
    s.patch?.removeFromParent();
    s.patch = new Mesh(made.geometry, deps.material);
    s.patch.name = 'crater-patch';
    s.patch.receiveShadow = true;
    s.patch.visible = false;
    group.add(s.patch);
    lightPatch(s, deps, rel);
    deps.note('crater patch built');
  };
  queue(deps.slicer, { name: 'crater:build', priority: BUILD_PRIORITY },
    [...made.jobs, swap], () => id === s.build);
}

/** Queues the raster's bake; its last job starts the build. */
export function startBake(s: State, deps: CraterDeps, then: () => void): void {
  if (s.field || s.baking) return;
  const { field, jobs } = bakeRelief(deps.seed);
  s.baking = true;
  const done = (): void => {
    s.field = field;
    s.baking = false;
    deps.note('crater relief baked');
    then();
  };
  queue(deps.slicer, { name: 'crater:bake', priority: BAKE_PRIORITY },
    [...jobs, done], () => s.baking);
}


/** Stales the queued work and frees the patch's mesh and its cut-out. */
export function freePatch(s: State, deps: CraterDeps): void {
  s.build++;
  s.light++;
  s.baking = false;
  s.patch?.geometry.dispose();
  s.patch?.removeFromParent();
  s.patch = null;
  deps.uniforms.uHoleR2.value = -1;
}
