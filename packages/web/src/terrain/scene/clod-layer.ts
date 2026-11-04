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
 * The clods' raster on the GPU (VENT-67): baked in slicer jobs of a few
 * milliseconds (the whole is about 150 ms), then uploaded as one texture
 * with mips, and the shader switched on. The slicer clears its queue when a
 * new ring replaces the old, so `start` may be called again and queues what
 * is not done. Freed with the layer.
 */
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
} from 'three';
import { CLOD_TEXELS } from '../clod-law';
import { bakeClods } from '../clod-relief';
import type { ClodUniforms } from './clod-glsl';
import type { Slicer } from './slicer';

/** After the craters' bake and patch, before the far levels. */
const PRIORITY = 1.4;

export interface ClodDeps {
  readonly seed: number;
  readonly uniforms: ClodUniforms;
  readonly slicer: Slicer;
  readonly note: (text: string) => void;
}

export class ClodLayer {
  private baking = false;
  private seed: number;

  constructor(private readonly deps: ClodDeps) {
    this.seed = deps.seed;
  }

  /** A new point on the same renderer: the old raster goes, freed. */
  reseed(seed: number): void {
    if (seed === this.seed) return;
    this.seed = seed;
    this.dispose();
  }

  /** Queues the bake unless it is done (queued again, it replaces itself). */
  start(): void {
    const { deps } = this;
    if (deps.uniforms.uClodOn.value > 0) return;
    this.baking = true;
    const { out, jobs } = bakeClods(this.seed);
    const upload = (): void => {
      deps.uniforms.uClod.value = textureOf(out);
      deps.uniforms.uClodOn.value = 1;
      this.baking = false;
      deps.note('clod relief baked');
    };
    [...jobs, upload].forEach((job, i) => {
      deps.slicer.add(`clods:${i}`, PRIORITY, () => {
        if (this.baking) job();
      }, true);
    });
  }

  /** Frees the texture and switches the shader off. */
  dispose(): void {
    const { uniforms } = this.deps;
    this.baking = false;
    uniforms.uClod.value?.dispose();
    uniforms.uClod.value = null;
    uniforms.uClodOn.value = 0;
  }
}

/** The packed raster as a repeating texture with mips. */
function textureOf(rgba: Uint8Array): DataTexture {
  const t = new DataTexture(rgba, CLOD_TEXELS, CLOD_TEXELS, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = NoColorSpace;
  t.needsUpdate = true;
  return t;
}
