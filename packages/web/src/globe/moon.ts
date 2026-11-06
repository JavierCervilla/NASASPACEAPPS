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
 * The Moon: a 64-segment sphere wearing the LROC colour mosaic and the LOLA
 * relief as an object-space normal map (see ASSETS.md), lit by the real
 * Sun (sun-light.ts); the relief never lights the night side
 * (night-side.ts), and the maps are sampled by sphere point, so the poles
 * show no star (pole-uv.ts). Sharper maps arrive as the camera closes in
 * (texture-lod.ts, texture-swap.ts).
 */
import {
  Mesh,
  MeshLambertMaterial,
  ObjectSpaceNormalMap,
  SphereGeometry,
  type Texture,
} from 'three';
import type { Tier } from '../lib/quality';
import { moonTextureDeps } from './moon-textures';
import type { EarlyStart } from './start-maps';
import { keepNightDark } from './night-side';
import { samplePolesExactly } from './pole-uv';
import type { Stage } from './stage';
import {
  levelUrls,
  startLevel,
  wantedLevel,
  type LodView,
} from './texture-lod';
import { textureBytes } from './texture-bytes';
import { TextureSwap } from './texture-swap';

/** Widthwise and heightwise segments of the sphere (spec: 64). */
const SEGMENTS = 64;

/** Grey until the first map arrives; the relief is an object-space map. */
const BARE_MOON = { color: 0x8c8a85, normalMapType: ObjectSpaceNormalMap };

export interface Moon {
  /** Bytes the maps hold on the GPU, with mipmaps; 0 until loaded. */
  textureBytes(): number;
  /** The camera now sees the Moon as `view` says (texture-lod.ts). */
  track(view: LodView): void;
  /**
   * Back to the start map, freeing the bigger ones (the globe is hidden:
   * VENT-86); the next frame drawn climbs again as the zoom asks.
   */
  rest(): void;
  dispose(): void;
}

export interface MoonOptions {
  /** The site's base path, for the maps. */
  readonly base: string;
  readonly tier: Tier;
  /** Under Save-Data the start map is the only one. */
  readonly saveData: boolean;
  readonly onChange: () => void;
  /** A map went onto the Moon. */
  readonly onTextured?: (() => void) | undefined;
  /** Whether the globe shows (shown-frames.ts). */
  readonly shown: () => boolean;
  readonly warn: (message: string) => void;
  /** The start maps the boot asked before the globe mounted (VENT-93). */
  readonly early?: EarlyStart | undefined;
  /** Compiles the scene's programs before a map shows (compile-gate.ts). */
  readonly compile?: (() => Promise<void>) | undefined;
}

/** Adds the Moon to the stage's scene. */
export function addMoon(stage: Stage, options: MoonOptions): Moon {
  const geometry = new SphereGeometry(1, SEGMENTS, SEGMENTS);
  const material = new MeshLambertMaterial(BARE_MOON);
  keepNightDark(material);
  samplePolesExactly(material);
  const { renderer } = stage;
  const { maxTextureSize } = renderer.capabilities;
  const swap = new TextureSwap<Texture>({
    ...moonTextureDeps({ ...options, renderer, material }),
    urls: (level) => levelUrls(level, options.base),
    warn: options.warn,
  });
  swap.want(startLevel(options.tier));
  stage.scene.add(new Mesh(geometry, material));
  return {
    textureBytes: () => textureBytes(material.map, material.normalMap),
    track: (v) => swap.want(wantedLevel(v, { ...options, maxTextureSize })),
    rest: () => swap.lower(startLevel(options.tier)),
    dispose: () => {
      swap.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
