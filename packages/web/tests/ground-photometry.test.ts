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
 * The ground's GLSL photometry is built from the TypeScript twin's
 * constants (VENT-62), and lands on the source three compiles.
 */
import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { DIFFUSE_R0, HAPKE } from '../src/terrain/hapke';
import {
  FLOOR_FROM_DEG,
  FLOOR_GAIN,
  FLOOR_LAMBERT,
  FLOOR_LS,
  LUNAR_NORM,
  PEAK_SMOOTH_DEG,
} from '../src/terrain/lunar-photometry';
import { glslFloat } from '../src/terrain/scene/glsl-float';
import {
  DARK_SMALL_SHADOWS,
  createFillUniforms,
  patchPhotometry,
} from '../src/terrain/scene/ground-photometry';

const patched = (): string => {
  const shader = { fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} } as unknown as Parameters<typeof patchPhotometry>[0];
  patchPhotometry(shader, createFillUniforms());
  return shader.fragmentShader;
};

describe('patchPhotometry', () => {
  it('routes the Sun through the lunar model, with no specular', () => {
    const source = patched();
    expect(source).toContain('#define RE_Direct RE_Direct_Ground');
    expect(source).toContain('directDiffuse +=');
    const ground = source.slice(source.indexOf('void RE_Direct_Ground'),
      source.indexOf('#undef RE_Direct'));
    expect(ground).not.toContain('directSpecular');
  });

  it('scales the fill, not the Sun, in a small shadow (VENT-64)', () => {
    const source = patched();
    expect(createFillUniforms().uDark.value).toBe(DARK_SMALL_SHADOWS);
    expect(DARK_SMALL_SHADOWS).toBeGreaterThan(0.5);
    expect(DARK_SMALL_SHADOWS).toBeLessThan(0.7);
    expect(source).toContain('fill.color *= groundDark();');
    expect(source).toContain('reflectedLight.indirectDiffuse *= groundDark();');
    expect(source).toContain('float gSunShade = 1.0;');
    const sun = source.slice(source.indexOf('if (dot(directLight.direction'),
      source.indexOf('IncidentLight fill'));
    expect(sun).not.toContain('groundDark');
  });

  it('names nothing with a word GLSL reserves (`coherent` once broke every ground)', () => {
    const source = patched();
    const ours = source.slice(source.indexOf('float gSunShade'),
      source.indexOf('#undef RE_Direct'));
    const reserved = ['coherent', 'volatile', 'restrict', 'readonly',
      'writeonly', 'shared', 'buffer', 'sample', 'filter', 'input', 'output',
      'common', 'partition', 'active', 'namespace', 'half', 'fixed', 'long',
      'short', 'double', 'unsigned', 'superp'];
    for (const word of reserved) {
      expect(ours, word).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it('carries the twin\'s constants', () => {
    const source = patched();
    for (const v of [...Object.values(HAPKE), DIFFUSE_R0, LUNAR_NORM,
      PEAK_SMOOTH_DEG ** 2, FLOOR_FROM_DEG, FLOOR_GAIN, FLOOR_LS,
      FLOOR_LAMBERT]) {
      expect(source).toContain(glslFloat(v));
    }
  });

  it('writes no int literal GLSL ES would refuse where a float goes', () => {
    const source = patched();
    const ground = source.slice(source.indexOf('float gSunShade'),
      source.indexOf('#undef RE_Direct'));
    const code = ground.replace(/\[0\]|1e-\d/g, '').replace(/^#if .*$/gm, '');
    expect(code.match(/(?<![\w.])\d+(?![\w.])/g)).toBeNull();
  });
});
