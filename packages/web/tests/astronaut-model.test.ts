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

import { readFileSync } from 'node:fs';
import {
  AnimationClip,
  Bone,
  Group,
  NumberKeyframeTrack,
  Object3D,
} from 'three';
import { describe, expect, it } from 'vitest';
import { createIdle } from '../src/terrain/scene/astronaut-idle';
import { urlModifierOf } from '../src/terrain/scene/astronaut';

interface GltfJson {
  extensionsRequired: string[];
  images: { uri: string }[];
  skins: { joints: unknown[] }[];
  animations: { name: string; samplers: { input: number }[] }[];
  accessors: { max?: number[]; count: number }[];
  materials: unknown[];
}

/** The JSON chunk of the shipped glb. */
function shippedJson(): GltfJson {
  const file = readFileSync(new URL('../models/astronaut-meshy.glb', import.meta.url));
  const length = file.readUInt32LE(12);
  return JSON.parse(file.subarray(20, 20 + length).toString('utf8')) as GltfJson;
}

describe('the shipped astronaut glb', () => {
  const json = shippedJson();

  it('is one skinned figure of 24 joints with one material and three WebP maps', () => {
    expect(json.skins).toHaveLength(1);
    expect(json.skins[0]!.joints).toHaveLength(24);
    expect(json.materials).toHaveLength(1);
    expect(json.images.map((i) => i.uri)).toEqual(['astronaut-meshy-0.webp', 'astronaut-meshy-1.webp', 'astronaut-meshy-2.webp']);
    expect(json.extensionsRequired).toEqual(['EXT_texture_webp']);
  });

  it('carries the idle and walk clips, each about four seconds', () => {
    const duration = (name: string) => {
      const clip = json.animations.find((a) => a.name === name)!;
      return json.accessors[clip.samplers[0]!.input]!.max![0]!;
    };
    expect(json.animations.map((a) => a.name).toSorted()).toEqual(['idle', 'walk']);
    expect(duration('idle')).toBeCloseTo(4, 1);
    expect(duration('walk')).toBeCloseTo(4.17, 1);
  });
});

describe('the astronaut’s map files', () => {
  const modify = urlModifierOf({ glb: 'g', images: { 'a-0.webp': '/_astro/a-0.H1.webp' } });

  it('maps a map named by the glb, wherever the loader resolved it', () => {
    expect(modify('a-0.webp')).toBe('/_astro/a-0.H1.webp');
    expect(modify('/_astro/a-0.webp')).toBe('/_astro/a-0.H1.webp');
  });

  it('leaves any other URL alone', () => {
    expect(modify('/_astro/astronaut.H2.glb')).toBe('/_astro/astronaut.H2.glb');
  });
});

describe('the astronaut’s idle', () => {
  /** A clip that raises a bone's x position by one a second, over four. */
  function rig() {
    const bone = new Bone();
    bone.name = 'b';
    const root = new Group();
    root.add(bone);
    const track = new NumberKeyframeTrack('b.position[x]', [0, 4], [0, 4]);
    return { bone, root, clip: new AnimationClip('idle', 4, [track]) };
  }

  it('stands on its pose until a frame runs, then moves on by the frame’s time', () => {
    const { bone, root, clip } = rig();
    const idle = createIdle(root as Object3D, clip, () => false);
    expect(bone.position.x).toBe(0);
    idle.advance(0.5);
    expect(bone.position.x).toBeCloseTo(0.5, 6);
  });

  it('never moves under reduced motion', () => {
    const { bone, root, clip } = rig();
    const idle = createIdle(root, clip, () => true);
    idle.advance(1);
    expect(bone.position.x).toBe(0);
  });

  it('loops past the end of the clip', () => {
    const { bone, root, clip } = rig();
    const idle = createIdle(root, clip, () => false);
    idle.advance(1);
    idle.advance(4.5);
    expect(bone.position.x).toBeCloseTo(1.5, 5);
  });
});
