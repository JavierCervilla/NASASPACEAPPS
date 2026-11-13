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
 * The Moon's maps as Three.js textures, for the swapper (texture-swap.ts):
 * how one loads (sRGB colour, linear relief, mipmaps and anisotropic
 * filtering), how it reaches the GPU before it shows, and how a level goes
 * onto the material. A map that arrives while the globe is hidden is not
 * uploaded (VENT-52): the GPU is the visible view's, and the first frame
 * drawn once the globe shows again uploads it, as Three.js does for any
 * texture not yet on the GPU. The start maps the boot asked early
 * (start-maps.ts) are taken, not fetched again, and a map goes on only
 * once the programs that draw it are compiled (compile-gate.ts, VENT-93).
 */
import {
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  TextureLoader,
  type MeshLambertMaterial,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { Tier } from '../lib/quality';
import type { Ktx2Switch } from '../textures/ktx2-session';
import { textureAt } from './early-texture';
import { handheldJpeg, type EightKGate } from './handheld-8k';
import { ktx2OrJpeg } from './ktx2-map';
import type { Ktx2Target } from './ktx2-target';
import type { MapTrace } from './map-trace';
import type { StartMaps } from './start-maps';
import type { SwapDeps } from './texture-fetch';

/**
 * Anisotropic samples per tier, within what the GPU offers: the low
 * tier's software renderers pay for each one.
 */
const ANISOTROPY: Readonly<Record<Tier, number>> = {
  low: 2,
  medium: 4,
  high: 8,
};

/** Trilinear filtering: the maps are seen from far and near. */
const MIPMAPPED = {
  generateMipmaps: true,
  minFilter: LinearMipmapLinearFilter,
} as const;

export interface MoonTextureOptions {
  readonly renderer: WebGLRenderer;
  readonly material: MeshLambertMaterial;
  readonly tier: Tier;
  /** Asks for a frame. */
  readonly onChange: () => void;
  /** A map went onto the Moon. */
  readonly onTextured?: (() => void) | undefined;
  /** Whether the globe shows; hidden, no map goes to the GPU. */
  readonly shown: () => boolean;
  /** The start maps asked before the globe mounted, if any. */
  readonly early?: { readonly maps: StartMaps } | undefined;
  /** Compiles the scene's programs; the frame waits for it. */
  readonly compile?: (() => Promise<void>) | undefined;
  /**
   * KTX2 colour maps for the session (VENT-101): the switch and the loader
   * of a `.ktx2` map. Without it, every map is a JPEG.
   */
  readonly ktx2?: {
    readonly session: Ktx2Switch;
    readonly load: (url: string, target: Ktx2Target) => Promise<Texture>;
  } | undefined;
  /** Where a KTX2 map or its fallback is told under `?debug`. */
  readonly trace?: Pick<MapTrace<Texture>, 'mark'> | undefined;
  /**
   * A phone or a coarse pointer, where the 8K colour comes only as KTX2,
   * and the gate its JPEG gives the 8K up through (handheld-8k.ts, VENT-123).
   */
  readonly handheld?: { readonly gate: EightKGate } | undefined;
}

type GpuDeps = Pick<SwapDeps<Texture>, 'load' | 'upload' | 'apply' | 'dispose'>;

/** Uploads a map now if the globe shows; else its first frame does. */
const uploadWhenShown = (renderer: WebGLRenderer, shown: () => boolean) =>
  (texture: Texture): void => {
    if (shown()) renderer.initTexture(texture);
  };

/**
 * Loads a map as the Moon's texture: filtered, in its colour space. A
 * `.ktx2` colour comes with its own levels (VENT-101), else its JPEG.
 */
function mapLoader(options: MoonTextureOptions): GpuDeps['load'] {
  const gpuMax = options.renderer.capabilities.getMaxAnisotropy();
  const anisotropy = Math.min(ANISOTROPY[options.tier], gpuMax);
  const loader = new TextureLoader();
  const jpeg = (url: string, kind: 'colour' | 'normal') =>
    textureAt(url, loader, options.early?.maps).then((texture) =>
      Object.assign(texture, MIPMAPPED, {
        anisotropy,
        colorSpace: kind === 'colour' ? SRGBColorSpace : NoColorSpace,
      }));
  const { ktx2 } = options;
  const mark = options.trace?.mark;
  const { handheld } = options;
  const colourJpeg = handheld
    ? handheldJpeg((url) => jpeg(url, 'colour'), handheld.gate)
    : (url: string) => jpeg(url, 'colour');
  const colour = ktx2 ? ktx2OrJpeg<Texture>({
    ktx2: (url, target) => ktx2.load(url, target)
      .then((texture) => Object.assign(texture, { anisotropy })),
    jpeg: colourJpeg,
    session: ktx2.session,
    mark,
  }) : colourJpeg;
  return (url, kind) => (kind === 'colour' ? colour(url) : jpeg(url, kind));
}

/**
 * Puts the maps on the material, then, once their programs are compiled,
 * asks a frame and tells that the Moon is textured.
 */
function mapsApplier(options: MoonTextureOptions): GpuDeps['apply'] {
  const { material, onChange, onTextured } = options;
  const compile = options.compile ?? (() => Promise.resolve());
  return (maps) => {
    material.color.set(0xffffff);
    material.map = maps.colour;
    material.normalMap = maps.normal;
    material.needsUpdate = true;
    void compile().then(() => {
      onChange();
      onTextured?.();
    });
  };
}

/** Loads, uploads, applies and frees the Moon's textures. */
export function moonTextureDeps(options: MoonTextureOptions): GpuDeps {
  return {
    load: mapLoader(options),
    upload: uploadWhenShown(options.renderer, options.shown),
    apply: mapsApplier(options),
    dispose: (texture) => texture.dispose(),
  };
}
