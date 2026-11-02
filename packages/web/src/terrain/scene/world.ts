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
import { EYE_M } from '../view-camera';
import { backdropMesh } from './backdrop';
import { groundMaterial } from './ground';
import { backdropM } from '../ring/ring-plan';
import type { RingLayer } from './ring-layer';
import type { FarShade } from './ring-shade';
import { applyRings } from './world-rings';
import { createSlicer, type Slicer } from './slicer';
import { ringsMesh } from './rings';
import { placeLander } from './lander-place';
import { landerSpot, rocksMesh } from './props';
import type { SceneInput } from './scene-types';
import { placeSky, shadeSun } from './sky-place';
import { createSky, type SkyParts } from './sky';
import { exposureFor, type Stage } from './stage';
import { createSunMask, type SunMask } from './sun-mask';
import { groundOf, type Ground } from './world-ground';

export interface World {
  readonly stage: Stage;
  readonly mask: SunMask;
  readonly sky: SkyParts;
  readonly astronaut: Group;
  /** The lander's holder: placed on the ground, filled when it loads. */
  readonly lander: Group;
  near: Group;
  ground: Ground;
  material: MeshStandardMaterial;
  backdrop: Mesh | null;
  input: SceneInput | null;
  /** The relief rings now drawn, their far shading and the work slicer. */
  rings: RingLayer | null;
  farShade: FarShade | null;
  readonly slicer: Slicer;
  /** Asks for a frame: bound to the scene's loop once it exists. */
  invalidate: () => void;
}

/** An empty world on `stage`. */
export function createWorld(stage: Stage, seed: number, shadowPx: number) {
  const mask = createSunMask();
  const slicer = createSlicer({ invalidate: () => world.invalidate() });
  const world: World = { stage, mask, sky: createSky(seed, shadowPx),
    astronaut: new Group(), lander: new Group(), near: new Group(),
    ground: () => 0,
    material: groundMaterial(mask), backdrop: null, input: null,
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

/** Changes what `input` changes. */
export function applyInput(world: World, input: SceneInput): void {
  const was = world.input;
  const tilesChanged = was?.tiles.length !== input.tiles.length ||
    input.tiles.some((t, i) => was.tiles[i] !== t);
  world.input = input;
  applyRings(world, input);
  if (tilesChanged) applyTiles(world, input);
  if (tilesChanged || was?.profile !== input.profile) {
    applyProfile(world, input);
  }
  if (!tilesChanged && was?.sky === input.sky &&
    was.profile === input.profile) return;
  placeSky(world.sky, input.sky, input.earthSpin);
  const onLit = (lit: Float32Array): void => {
    world.rings?.setLit(0, { lit, sizeM: input.tiles[0]?.tile.sizeM ?? 0 });
  };
  const sun = { azDeg: input.sky.sunAz, elDeg: input.sky.sunEl };
  shadeSun({ tiles: input.tiles, onLit, profile: input.profile,
    mask: world.mask }, input.sky);
  world.farShade?.run(sun);
  world.stage.renderer.toneMappingExposure =
    exposureFor(world.mask.near.value > 0);
}
