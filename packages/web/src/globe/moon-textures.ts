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
 * texture not yet on the GPU.
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
import type { MoonMaps, SwapDeps } from './texture-fetch';

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
}

type GpuDeps = Pick<SwapDeps<Texture>, 'load' | 'upload' | 'apply' | 'dispose'>;

/** Uploads a map now if the globe shows; else its first frame does. */
const uploadWhenShown = (renderer: WebGLRenderer, shown: () => boolean) =>
  (texture: Texture): void => {
    if (shown()) renderer.initTexture(texture);
  };

/** Loads, uploads, applies and frees the Moon's textures. */
export function moonTextureDeps(options: MoonTextureOptions): GpuDeps {
  const { renderer, material, tier, onChange, onTextured, shown } = options;
  const gpuMax = renderer.capabilities.getMaxAnisotropy();
  const anisotropy = Math.min(ANISOTROPY[tier], gpuMax);
  const loader = new TextureLoader();
  return {
    load: (url, kind) =>
      loader.loadAsync(url).then((texture) =>
        Object.assign(texture, MIPMAPPED, {
          anisotropy,
          colorSpace: kind === 'colour' ? SRGBColorSpace : NoColorSpace,
        }),
      ),
    upload: uploadWhenShown(renderer, shown),
    apply: (maps: MoonMaps<Texture>) => {
      material.color.set(0xffffff);
      material.map = maps.colour;
      material.normalMap = maps.normal;
      material.needsUpdate = true;
      onChange();
      onTextured?.();
    },
    dispose: (texture) => texture.dispose(),
  };
}
