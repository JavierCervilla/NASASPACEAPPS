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
 * The scene's world (VENT-34, VENT-46): it takes each {@link SceneInput} and
 * changes only what changed: the relief rings' meshes (a layer per ring,
 * freed with it), the near ground's props and rings, the far horizon when
 * the profile does, and the sky, its shadows and the Sun's mask when the
 * instant does.
 */
import {
  Group,
  type Mesh,
  type MeshDepthMaterial,
  type MeshStandardMaterial,
} from 'three';
import { groundPolicy, type GroundPolicy } from '../ground-policy';
import { drawsAgain } from '../input-change';
import { EYE_M } from '../view-camera';
import { backdropMesh } from './backdrop';
import { createClodUniforms } from './clod-glsl';
import type { ClodLayer } from './clod-layer';
import { createCraterUniforms } from './crater-depth';
import type { CraterLayer } from './crater-layer';
import { createFineUniforms, type FineUniforms } from './ground-fine';
import { createFillUniforms } from './ground-photometry';
import { groundMaterial, type GroundShared } from './ground';
import { clodLayer, craterParts } from './world-craters';
import { backdropM } from '../ring/ring-plan';
import type { RingLayer } from './ring-layer';
import type { FarShade } from './ring-shade';
import { applyRings } from './world-rings';
import { castsShadow } from './shadow-jobs';
import { createSlicer, type Slicer } from './slicer';
import { ringsMesh } from './rings';
import { rocksMesh } from './props';
import type { SceneInput, SceneSetup, SkyDirs } from './scene-types';
import { createSky, type SkyParts } from './sky';
import type { Stage } from './stage';
import { createSunMask, type SunMask } from './sun-mask';
import { relightWorld } from './world-light';
import { groundOf, type Ground } from './world-ground';

export interface World {
  readonly stage: Stage;
  /** What this mount draws at and without (its tier, `?onfoot=`). */
  readonly setup: SceneSetup;
  /** What the ground costs at this tier (ground-policy.ts, VENT-69). */
  readonly policy: GroundPolicy;
  readonly mask: SunMask;
  readonly sky: SkyParts;
  near: Group;
  ground: Ground;
  material: MeshStandardMaterial;
  /** The fine real relief's uniforms (VENT-62), shared with the material. */
  readonly fine: FineUniforms;
  /** What the ground's materials share, and the crater patch (VENT-64). */
  readonly shared: GroundShared;
  readonly craters: CraterLayer | null;
  /** The clods' bake (VENT-67), none on low or with `?onfoot=grain`. */
  readonly clods: ClodLayer | null;
  readonly patchMaterial: MeshStandardMaterial | null;
  /** The rings' shadow depth without the patch's disc, with the patch. */
  readonly ringDepth: MeshDepthMaterial | null;
  backdrop: Mesh | null;
  input: SceneInput | null;
  /**
   * The sky the world is lit for: the last one that moved the Sun or the
   * Earth enough to light again (world-light.ts); null before the first.
   */
  lit: SkyDirs | null;
  /** The relief rings now drawn, their far shading and the work slicer. */
  rings: RingLayer | null;
  farShade: FarShade | null;
  readonly slicer: Slicer;
  /** Asks for a frame: bound to the scene's loop once it exists. */
  invalidate: () => void;
  /** The surface maps gave up on the first frame and are still coming. */
  mapsPending: boolean;
}

/** An empty world on `stage`. */
export function createWorld(stage: Stage, seed: number, setup: SceneSetup) {
  const mask = createSunMask();
  const slicer = createSlicer({ invalidate: () => world.invalidate(),
    onJob: (key) => {
      if (castsShadow(key)) stage.shadow.mark();
    } });
  const shadowPx = setup.quality.tier === 'high' ? 2048 : 1024;
  const fine = createFineUniforms();
  const policy = groundPolicy(setup.quality.tier, setup.leave);
  const shared = { fine, craters: createCraterUniforms(),
    fill: createFillUniforms(), clods: createClodUniforms() };
  const parts = { mask, shared, slicer, policy };
  const world: World = { stage, setup, policy, mask,
    sky: createSky(seed, shadowPx),
    near: new Group(), ground: () => 0, fine, shared,
    ...craterParts(seed, setup, parts),
    clods: clodLayer(seed, setup, parts),
    material: groundMaterial(mask, shared, policy), backdrop: null,
    input: null,
    lit: null, rings: null, farShade: null, slicer,
    invalidate: () => undefined, mapsPending: false };
  stage.scene.add(world.sky.group, world.near);
  if (world.craters) stage.scene.add(world.craters.group);
  return world;
}

/** The near ground changed: the props stand on the new ground. */
function applyTiles(world: World, input: SceneInput): void {
  world.ground = groundOf(input.tiles);
  world.craters?.setGround(world.ground);
  rebuildNear(world, input);
}

/** The rocks and the rings over the new ground. */
function rebuildNear(world: World, input: SceneInput): void {
  world.stage.scene.remove(world.near);
  world.near.traverse((o) => (o as Partial<Mesh>).geometry?.dispose());
  world.near = new Group();
  world.near.add(ringsMesh(world.ground));
  if (world.policy.rocksCap > 0) {
    const stand = world.craters?.groundFor(world.ground) ?? world.ground;
    world.near.add(rocksMesh(input.seed, stand, world.mask,
      { slicer: world.slicer,
        law: { ...world.policy.rockLaw, cap: world.policy.rocksCap } }));
  }
  world.stage.scene.add(world.near);
  world.setup.report.step('near ground placed');
}

/** The far horizon from `profile`, around the eye over the point. */
function applyProfile(world: World, input: SceneInput): void {
  if (world.backdrop) {
    world.stage.scene.remove(world.backdrop);
    world.backdrop.geometry.dispose();
  }
  const radius = backdropM(input.ring.tier);
  const eyeY = world.ground(0, 0) + EYE_M;
  world.backdrop = backdropMesh(input.profile, eyeY, radius);
  world.stage.scene.add(world.backdrop);
}

/**
 * Changes what `input` changes; true when the view has to draw again. A new
 * instant lights the world and draws only when the Sun or the Earth moved
 * enough to see (world-light.ts); a ground or a ring that is new lights it
 * whatever the sky did.
 */
export function applyInput(world: World, input: SceneInput): boolean {
  const was = world.input;
  const tilesChanged = was?.tiles.length !== input.tiles.length ||
    input.tiles.some((t, i) => was.tiles[i] !== t);
  const profileChanged = was?.profile !== input.profile;
  world.input = input;
  if (was && was.seed !== input.seed) {
    // The old point's ground is not this one's: no patch builds on it.
    world.craters?.setGround(null, input.seed);
    world.clods?.reseed(input.seed);
  }
  const ringChanged = applyRings(world, input);
  if (tilesChanged) applyTiles(world, input);
  else if (ringChanged) world.craters?.setGround();
  if (tilesChanged || profileChanged) applyProfile(world, input);
  if (tilesChanged || profileChanged || ringChanged) world.stage.shadow.mark();
  const forced = tilesChanged || profileChanged || was?.ring !== input.ring;
  const lit = (forced || was?.sky !== input.sky) &&
    relightWorld(world, input, forced);
  return lit || drawsAgain(was, input);
}
