/**
 * What the Moon's maps hold on the GPU, for the performance readout: RGBA
 * texels plus a third for the mipmap chain.
 */
import type { Texture } from 'three';

/** Estimated GPU bytes of `textures`; a missing one counts 0. */
export function textureBytes(...textures: (Texture | null)[]): number {
  return textures.reduce((sum, texture) => {
    const image = texture?.image as { width?: number; height?: number } | null;
    const pixels = (image?.width ?? 0) * (image?.height ?? 0);
    return sum + Math.round(pixels * 4 * (4 / 3));
  }, 0);
}
