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
 * The clods in the ground's shader and on the GPU (VENT-67): the shader's
 * march and fade, the raster's upload and its switch.
 */
import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { CLOD_TEXELS } from '../src/terrain/clod-law';
import {
  FADE_LEVELS,
  MARCH,
  createClodUniforms,
  patchClods,
} from '../src/terrain/scene/clod-glsl';
import { ClodLayer } from '../src/terrain/scene/clod-layer';
import { antiTile } from '../src/terrain/scene/ground-shader';
import type { Slicer } from '../src/terrain/scene/slicer';

type Shader = Parameters<typeof patchClods>[0];

const shaderOf = (tier: 'high' | 'medium', patch: boolean): Shader => {
  const shader = { vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} } as unknown as Shader;
  antiTile(shader);
  patchClods(shader, createClodUniforms(), { tier, patch });
  return shader;
};

describe('the clods in the shader', () => {
  const high = shaderOf('high', false).fragmentShader;

  it('tilts the normal and shades the Sun per pixel, before the normal\'s scale', () => {
    expect(high).toContain('mapN.xy -= kw * clodSlope(kp, kl) / normalScale;');
    expect(high).toContain('gSunShade *= mix(1.0, clodShadow(kp, kl, ks, kTilt), kw);');
    expect(high.indexOf('clodSlope(kp, kl)'))
      .toBeLessThan(high.indexOf('mapN.xy *= normalScale;'));
  });

  it('does nothing until the raster is up, and past the footprint fade', () => {
    expect(high).toContain('if (uClodOn > 0.5) {');
    expect(high).toContain('if (kw > 0.001) {');
    expect(FADE_LEVELS).toEqual([4, 6.5]);
  });

  it('marches fewer steps on medium than on high', () => {
    expect(MARCH.medium.steps).toBeLessThan(MARCH.high.steps);
    expect(high).toContain(`i < ${MARCH.high.steps}`);
    expect(shaderOf('medium', false).fragmentShader).toContain(`i < ${MARCH.medium.steps}`);
  });

  it('adds the craters\' slope to the tilt only on the patch', () => {
    expect(shaderOf('high', true).fragmentShader).toContain('+ dot(vCSlope, kd)');
    expect(high).not.toContain('vCSlope');
  });

  it('writes no int literal GLSL ES would refuse where a float goes', () => {
    const code = high.slice(high.indexOf('uniform sampler2D uClod'),
      high.indexOf('float h21('))
      + high.slice(high.indexOf('if (uClodOn > 0.5)'),
        high.indexOf('mapN.xy *= normalScale;'));
    const bare = code.replace(/for \(int i = 0; i < \d+; i\+\+\)|\[0\]|1e-\d/g, '')
      .replace(/^\s*#.*$/gm, '');
    expect(bare.match(/(?<![\w.])\d+(?![\w.])/g)).toBeNull();
  });
});

function fakeSlicer(): Slicer & { drain: () => number; clearAll: () => void } {
  const queue = new Map<string, () => void>();
  return {
    add: (key, _priority, job) => void queue.set(key, job),
    clear: () => queue.clear(),
    clearAll: () => queue.clear(),
    busy: () => queue.size > 0,
    drain: () => {
      let ran = 0;
      for (const [key, job] of [...queue]) {
        queue.delete(key);
        job();
        ran++;
      }
      return ran;
    },
  };
}

describe('the clod layer', () => {
  const make = () => {
    const slicer = fakeSlicer();
    const uniforms = createClodUniforms();
    const notes: string[] = [];
    const layer = new ClodLayer({ seed: 5, uniforms, slicer,
      note: (t) => notes.push(t) });
    return { slicer, uniforms, layer, notes };
  };

  it('bakes in many jobs, then uploads a mipmapped repeating texture and switches on', () => {
    const { slicer, uniforms, layer, notes } = make();
    layer.start();
    expect(uniforms.uClodOn.value).toBe(0);
    expect(slicer.drain()).toBeGreaterThan(20);
    const texture = uniforms.uClod.value!;
    expect((texture.image as { width: number }).width).toBe(CLOD_TEXELS);
    expect(texture.generateMipmaps).toBe(true);
    expect(uniforms.uClodOn.value).toBe(1);
    expect(notes).toEqual(['clod relief baked']);
  });

  it('queues again when the slicer lost its jobs, and not once done', () => {
    const { slicer, layer } = make();
    layer.start();
    slicer.clearAll();
    layer.start();
    expect(slicer.drain()).toBeGreaterThan(20);
    layer.start();
    expect(slicer.drain()).toBe(0);
  });

  it('frees the texture and switches off when it is disposed', () => {
    const { slicer, uniforms, layer } = make();
    layer.start();
    slicer.drain();
    layer.dispose();
    expect(uniforms.uClod.value).toBeNull();
    expect(uniforms.uClodOn.value).toBe(0);
  });

  it('does nothing of a bake that was disposed midway', () => {
    const { slicer, uniforms, layer } = make();
    layer.start();
    layer.dispose();
    slicer.drain();
    expect(uniforms.uClodOn.value).toBe(0);
  });
});
