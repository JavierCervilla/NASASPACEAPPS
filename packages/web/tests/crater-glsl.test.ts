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
 * The crater patch's two variants of the ground shader (VENT-64): the
 * rings' cuts out the patch's disc, in the colour and the shadow-depth
 * passes; the patch's adds the craters' slope after the normal map.
 */
import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { patchCraters } from '../src/terrain/scene/crater-glsl';
import {
  createCraterUniforms,
  ringDepthMaterial,
} from '../src/terrain/scene/crater-depth';
import { antiTile } from '../src/terrain/scene/ground-shader';

type Shader = Parameters<typeof patchCraters>[0];

const shaderOf = (patch: boolean): Shader => {
  const shader = { vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} } as unknown as Shader;
  antiTile(shader);
  patchCraters(shader, createCraterUniforms(), patch);
  return shader;
};

describe('the rings\' variant', () => {
  const shader = shaderOf(false);

  it('discards the patch\'s disc, only while a patch is there', () => {
    expect(shader.fragmentShader).toContain('uniform float uHoleR2;');
    expect(shader.fragmentShader).toContain(
      'if (uHoleR2 > 0.0 && dot(vCraterW.xz, vCraterW.xz) < uHoleR2) discard;');
    expect(Object.keys(shader.uniforms)).toEqual(['uHoleR2']);
  });

  it('reads the world position in the vertex shader, and has no slope', () => {
    expect(shader.vertexShader).toContain('vCraterW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    expect(shader.vertexShader).not.toContain('cslope');
    expect(shader.fragmentShader).not.toContain('vCSlope');
  });
});

describe('the patch\'s variant', () => {
  const shader = shaderOf(true);

  it('adds the craters\' slope to the normal before its scale', () => {
    const f = shader.fragmentShader;
    const add = f.indexOf('mapN.xy -= vCSlope / normalScale;');
    expect(add).toBeGreaterThan(0);
    expect(add).toBeLessThan(f.indexOf('mapN.xy *= normalScale;'));
    expect(shader.vertexShader).toContain('attribute vec2 cslope;');
    expect(shader.vertexShader).toContain('vCSlope = cslope;');
  });

  it('never cuts itself out', () => {
    expect(shader.fragmentShader).not.toContain('discard');
    expect(shader.uniforms).toEqual({});
  });
});

describe('the rings\' shadow depth', () => {
  it('discards the same disc, from the same uniform', () => {
    const uniforms = createCraterUniforms();
    const material = ringDepthMaterial(uniforms);
    const shader = { vertexShader: ShaderLib.depth.vertexShader,
      fragmentShader: ShaderLib.depth.fragmentShader,
      uniforms: {} } as unknown as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, null as never);
    expect(shader.fragmentShader).toContain('discard;');
    expect(shader.uniforms['uHoleR2']).toBe(uniforms.uHoleR2);
    expect(uniforms.uHoleR2.value).toBe(-1);
  });
});
