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
 * The scene's world (VENT-34): it takes each {@link SceneInput} and
 * changes only what changed: tiles by key (added, dropped and freed), the
 * near props and rings when the ground changes, the far horizon when the
 * profile does, and the sky, its shadows and the Sun's mask when the
 * instant does.
 */
import { Group, type BufferAttribute, type Mesh,
  type MeshLambertMaterial } from 'three';
import type { HorizonProfile } from '@ventana/sim';
import { EYE_M } from '../view-camera';
import { backdropMesh } from './backdrop';
import { dropTile, groundMaterial, tileMesh } from './ground';
import { ringsMesh } from './rings';
import { landerMesh, landerSpot, rocksMesh } from './props';
import type { SceneInput } from './scene-types';
import { placeSky, shadeSun } from './sky-place';
import { createSky, type SkyParts } from './sky';
import type { Stage } from './stage';
import { createSunMask, type SunMask } from './sun-mask';
import { groundOf, type Ground } from './world-ground';

export interface World {
  readonly stage: Stage;
  readonly mask: SunMask;
  readonly sky: SkyParts;
  readonly astronaut: Group;
  near: Group;
  ground: Ground;
  material: MeshLambertMaterial | null;
  backdrop: Mesh | null;
  input: SceneInput | null;
}

/** An empty world on `stage`. */
export function createWorld(stage: Stage, seed: number, shadowPx: number) {
  const world: World = { stage, mask: createSunMask(), sky: createSky(seed,
    shadowPx), astronaut: new Group(), near: new Group(), ground: () => 0,
    material: null, backdrop: null, input: null };
  stage.scene.add(world.sky.group, world.astronaut, world.near);
  return world;
}

/** Puts `tiles` on the scene by key; drops and frees the others. */
function applyTiles(world: World, input: SceneInput): void {
  const { scene } = world.stage;
  world.material ??= groundMaterial(input.seed, world.mask);
  const keys = new Set(input.tiles.map((p) => p.tile.key));
  const was = world.input?.tiles ?? [];
  for (const old of was) {
    if (!keys.has(old.tile.key)) dropTile(scene, old.tile.key);
  }
  for (const placed of input.tiles) {
    if (was.includes(placed)) continue;
    dropTile(scene, placed.tile.key);
    const lit = new Float32Array(placed.tile.n * placed.tile.n).fill(1);
    scene.add(tileMesh(placed, lit, world.material));
  }
  world.ground = groundOf(input.tiles);
  rebuildNear(world, input);
}

/** The rocks, the lander and the rings over the new ground. */
function rebuildNear(world: World, input: SceneInput): void {
  world.stage.scene.remove(world.near);
  world.near.traverse((o) => (o as Partial<Mesh>).geometry?.dispose());
  const spot = landerSpot(input.startYawDeg);
  world.near = new Group();
  world.near.add(rocksMesh(input.seed, world.ground, spot, world.mask),
    landerMesh(spot, world.ground, world.mask), ringsMesh(world.ground));
  world.stage.scene.add(world.near);
}

/** The far horizon from `profile`, around the eye over the point. */
function applyProfile(world: World, profile: HorizonProfile | null): void {
  if (world.backdrop) {
    world.stage.scene.remove(world.backdrop);
    world.backdrop.geometry.dispose();
  }
  world.backdrop = backdropMesh(profile, world.ground(0, 0) + EYE_M);
  world.stage.scene.add(world.backdrop);
}

/** Changes what `input` changes. */
export function applyInput(world: World, input: SceneInput): void {
  const was = world.input;
  const tilesChanged = was?.tiles.length !== input.tiles.length ||
    input.tiles.some((t, i) => was.tiles[i] !== t);
  if (tilesChanged) applyTiles(world, input);
  if (tilesChanged || was?.profile !== input.profile) {
    applyProfile(world, input.profile);
  }
  world.input = input;
  if (!tilesChanged && was?.sky === input.sky &&
    was.profile === input.profile) return;
  placeSky(world.sky, input.sky);
  const lit = (key: string) => (world.stage.scene.getObjectByName(key) as
    Mesh | undefined)?.geometry.getAttribute('lit') as BufferAttribute;
  shadeSun({ tiles: input.tiles, lit, profile: input.profile,
    mask: world.mask }, input.sky);
}
