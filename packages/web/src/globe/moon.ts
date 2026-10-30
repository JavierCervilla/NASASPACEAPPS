/**
 * The Moon: a 64-segment sphere wearing the LROC colour mosaic (see
 * ASSETS.md), lit by one directional light from the real Sun and a faint
 * ambient term so the night side keeps its shape.
 */
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  type Scene,
  type Texture,
} from 'three';
import type { SelenographicPoint } from '@ventana/sim';
import { latLonToVector } from './geo';

/** Widthwise and heightwise segments of the sphere (spec: 64). */
const SEGMENTS = 64;
/** Sunlight, and the faint fill that stands in for earthshine. */
const SUN_INTENSITY = 3.2;
const FILL_INTENSITY = 0.05;

export interface Moon {
  /** Bytes the texture holds on the GPU, with mipmaps; 0 until loaded. */
  textureBytes(): number;
  dispose(): void;
}

export interface MoonOptions {
  readonly textureUrl: string;
  readonly sun: SelenographicPoint;
  readonly onChange: () => void;
  readonly warn: (message: string) => void;
}

/** Adds the Moon and its lights to `scene`. */
export function addMoon(scene: Scene, options: MoonOptions): Moon {
  const geometry = new SphereGeometry(1, SEGMENTS, SEGMENTS);
  const material = new MeshLambertMaterial({ color: 0x8c8a85 });
  const texture = new TextureLoader().load(
    options.textureUrl,
    (loaded) => {
      loaded.colorSpace = SRGBColorSpace;
      material.color.set(0xffffff);
      material.map = loaded;
      material.needsUpdate = true;
      options.onChange();
    },
    undefined,
    () => options.warn(`Ventana Lunar: Moon texture ${options.textureUrl} did not load.`),
  );
  scene.add(new Mesh(geometry, material), ...sunLights(options.sun));
  return {
    textureBytes: () => (material.map ? textureBytesOf(material.map) : 0),
    dispose: () => [geometry, material, texture].forEach((x) => x.dispose()),
  };
}

function sunLights(sun: SelenographicPoint): [DirectionalLight, AmbientLight] {
  const light = new DirectionalLight(0xffffff, SUN_INTENSITY);
  const { x, y, z } = latLonToVector(sun.latDeg, sun.lonEastDeg, 10);
  light.position.set(x, y, z);
  return [light, new AmbientLight(0xffffff, FILL_INTENSITY)];
}

function textureBytesOf(texture: Texture): number {
  const image = texture.image as { width?: number; height?: number } | null;
  // RGBA, plus a third for the mipmap chain.
  return Math.round((image?.width ?? 0) * (image?.height ?? 0) * 4 * (4 / 3));
}
