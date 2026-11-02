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
 * The astronaut (VENT-34): a rigged Meshy figure (packages/web/models/
 * astronaut-meshy.glb, ASSETS.md), read by three's GLTFLoader, which only
 * this scene chunk imports (the globe's start chunk never carries it).
 * The glb's WebP maps are named by URI; a loading manager maps each URI to
 * the file the bundler shipped (astronaut-assets.ts). 1.91 m tall, feet
 * on the origin, +Y up, facing +Z, standing in a soft contact shadow on
 * its `idle` pose; its `walk` clip is loaded and left unused (VENT-48).
 * Third person shows it, facing where the view looks.
 */
import {
  type AnimationClip,
  type Group,
  LoadingManager,
  type Mesh,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import files from './astronaut-assets';
import { createIdle, type Idle } from './astronaut-idle';
import { contactShadow } from './contact-shadow';
import type { ModelFiles } from './model-files';
import { maskSun, type SunMask } from './sun-mask';

const SHADOW = { radius: 0.95, opacity: 0.6 } as const;

/** What the loader needs from the scene. */
export interface AstronautHost {
  readonly into: Group;
  readonly mask: SunMask;
  /** False once the scene is freed: nothing more is built. */
  readonly alive: () => boolean;
  /** Whether the person asked for less motion (asked every frame). */
  readonly reducedMotion: () => boolean;
}

/** Maps a map's URI inside the glb to the file the bundler shipped. */
export const urlModifierOf = (model: ModelFiles) =>
  (url: string): string => model.images[url.split('/').pop() ?? url] ?? url;

/** The clip called `name`, or null. */
const clipNamed = (clips: readonly AnimationClip[], name: string):
  AnimationClip | null => clips.find((c) => c.name === name) ?? null;

/** Casts and receives shadows, with the Sun's mask on its direct light. */
function dressed(root: Object3D, mask: SunMask): void {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    [mesh.material].flat().forEach((m) => maskSun(m, mask, false));
  });
}

/**
 * Loads the astronaut into `host.into`; resolves with its idle (null when
 * the glb has none), or null after a warning when it did not load.
 */
export async function loadAstronaut(
  host: AstronautHost,
  warn: (message: string) => void,
): Promise<Idle | null> {
  try {
    const manager = new LoadingManager();
    manager.setURLModifier(urlModifierOf(files));
    const gltf = await new GLTFLoader(manager).loadAsync(files.glb);
    if (!host.alive()) return null;
    dressed(gltf.scene, host.mask);
    host.into.add(gltf.scene, contactShadow(SHADOW.radius, SHADOW.opacity));
    const idle = clipNamed(gltf.animations, 'idle');
    return idle ? createIdle(gltf.scene, idle, host.reducedMotion) : null;
  } catch (error) {
    warn(`Ventana Lunar: the astronaut did not load (${String(error)}).`);
    return null;
  }
}
