/**
 * The Moon's maps as Three.js textures, for the swapper (texture-swap.ts):
 * how one loads (sRGB colour, linear relief, mipmaps and anisotropic
 * filtering), how it reaches the GPU before it shows, and how a level goes
 * onto the material.
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
}

type GpuDeps = Pick<SwapDeps<Texture>, 'load' | 'upload' | 'apply' | 'dispose'>;

/** Loads, uploads, applies and frees the Moon's textures. */
export function moonTextureDeps(options: MoonTextureOptions): GpuDeps {
  const { renderer, material, tier, onChange } = options;
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
    upload: (texture) => renderer.initTexture(texture),
    apply: (maps: MoonMaps<Texture>) => {
      material.color.set(0xffffff);
      material.map = maps.colour;
      material.normalMap = maps.normal;
      material.needsUpdate = true;
      onChange();
    },
    dispose: (texture) => texture.dispose(),
  };
}
