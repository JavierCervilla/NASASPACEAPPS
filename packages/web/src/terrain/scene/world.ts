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
import { Group, type Mesh, type MeshStandardMaterial } from 'three';
import { drawsAgain } from '../input-change';
import { EYE_M } from '../view-camera';
import { backdropMesh } from './backdrop';
import { groundMaterial } from './ground';
import { backdropM } from '../ring/ring-plan';
import type { RingLayer } from './ring-layer';
import type { FarShade } from './ring-shade';
import { applyRings } from './world-rings';
import type { Idle } from './astronaut-idle';
import { createSlicer, type Slicer } from './slicer';
import { ringsMesh } from './rings';
import { placeLander } from './lander-place';
import { landerSpot, rocksMesh } from './props';
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
  readonly mask: SunMask;
  readonly sky: SkyParts;
  readonly astronaut: Group;
  /** The astronaut's idle once loaded: moved only by drawn frames. */
  idle: Idle | null;
  /** The lander's holder: placed on the ground, filled when it loads. */
  readonly lander: Group;
  near: Group;
  ground: Ground;
  material: MeshStandardMaterial;
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
}

/** An empty world on `stage`. */
export function createWorld(stage: Stage, seed: number, setup: SceneSetup) {
  const mask = createSunMask();
  const slicer = createSlicer({ invalidate: () => world.invalidate() });
  const shadowPx = setup.quality.tier === 'high' ? 2048 : 1024;
  const world: World = { stage, setup, mask, sky: createSky(seed, shadowPx),
    astronaut: new Group(), idle: null, lander: new Group(), near: new Group(),
    ground: () => 0,
    material: groundMaterial(mask), backdrop: null, input: null, lit: null,
    rings: null, farShade: null, slicer, invalidate: () => undefined };
  stage.scene.add(world.sky.group, world.astronaut, world.lander,
    world.near);
  return world;
}

/** The near ground changed: the props stand on the new ground. */
function applyTiles(world: World, input: SceneInput): void {
  world.ground = groundOf(input.tiles);
  rebuildNear(world, input);
}

/** The rocks, the lander and the rings over the new ground. */
function rebuildNear(world: World, input: SceneInput): void {
  world.stage.scene.remove(world.near);
  world.near.traverse((o) => (o as Partial<Mesh>).geometry?.dispose());
  const spot = landerSpot(input.startYawDeg);
  world.near = new Group();
  world.near.add(rocksMesh(input.seed, world.ground,
    { spot, kind: input.lander }, world.mask), ringsMesh(world.ground));
  world.stage.scene.add(world.near);
  placeLander(world.lander, world.ground, input);
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
  applyRings(world, input);
  if (tilesChanged) applyTiles(world, input);
  if (tilesChanged || profileChanged) applyProfile(world, input);
  const forced = tilesChanged || profileChanged || was?.ring !== input.ring;
  const lit = (forced || was?.sky !== input.sky) &&
    relightWorld(world, input, forced);
  return lit || drawsAgain(was, input);
}
