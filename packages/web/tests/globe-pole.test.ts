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

import { ShaderLib, SphereGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { darkenNightSide } from '../src/globe/night-side';
import { GRADIENT_GLSL, sampleBySpherePoint } from '../src/globe/pole-uv';

/** The shader's `sphereUv`, in JavaScript: the UV the fragment samples at sphere point `p`. */
function sphereUv(x: number, y: number, z: number): [number, number] {
  const length = Math.hypot(x, y, z);
  const [px, py, pz] = [x / length, y / length, z / length];
  const turn = Math.atan2(pz, -px) / (2 * Math.PI);
  return [turn - Math.floor(turn), Math.asin(Math.max(-1, Math.min(1, py))) / Math.PI + 0.5];
}

describe('maps sampled by sphere point (no star at the pole)', () => {
  const lambert = ShaderLib.lambert;
  const patched = sampleBySpherePoint(lambert.vertexShader, darkenNightSide(lambert.fragmentShader));

  it('works out the same UV as the sphere’s vertices, so nothing moves but the poles', () => {
    const sphere = new SphereGeometry(1, 64, 64);
    const position = sphere.getAttribute('position');
    const uv = sphere.getAttribute('uv');
    let checked = 0;
    for (let i = 0; i < position.count; i++) {
      const [u, v] = sphereUv(position.getX(i), position.getY(i), position.getZ(i));
      const pole = Math.abs(position.getY(i)) > 0.9999;
      // The seam's vertices carry u = 1 where the formula says 0: the same texel column.
      const seam = Math.abs(uv.getX(i) - 1) < 1e-6;
      if (pole || seam) continue;
      expect(u).toBeCloseTo(uv.getX(i), 6);
      expect(v).toBeCloseTo(uv.getY(i), 6);
      checked++;
    }
    expect(checked).toBeGreaterThan(4000);
  });

  it('samples the colour and the relief by gradient, keeping the night side patch', () => {
    expect(patched.vertexShader).toContain('vSpherePos = position;');
    expect(patched.fragmentShader).toContain('textureGrad( tex, uv, gx, gy )');
    expect(patched.fragmentShader).toContain('diffuseColor *= sampleSphere( map );');
    expect(patched.fragmentShader).toContain('normal = sampleSphere( normalMap ).xyz * 2.0 - 1.0;');
    expect(patched.fragmentShader).not.toContain('#include <map_fragment>');
    expect(patched.fragmentShader).toContain('sphereNormal = nonPerturbedNormal;');
  });

  it('fails loudly if Three.js changes the lines it patches', () => {
    expect(() => sampleBySpherePoint('void main() {}', lambert.fragmentShader)).toThrow('Lambert shader changed');
    expect(() => sampleBySpherePoint(lambert.vertexShader, 'void main() {}')).toThrow('Lambert shader changed');
  });
});

/**
 * The shader's gradient helpers, run as JavaScript: they are scalar GLSL (floats, `abs`, `max`, `clamp`,
 * `smoothstep`, `mix`, ternaries), so dropping the types and naming the built-ins is enough.
 */
function gradientHelpers(): Record<'seamless' | 'polarCap' | 'uGradient', (...args: number[]) => number> {
  const js = GRADIENT_GLSL.replace(/float (\w+)\(([^)]*)\)\s*\{/g, (_, name: string, params: string) =>
    `function ${name}(${params.replace(/float /g, '')}) {`,
  ).replace(/\bfloat (\w+) =/g, 'const $1 =');
  const builtIns = {
    abs: Math.abs,
    max: Math.max,
    clamp: (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x)),
    smoothstep: (e0: number, e1: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    },
    mix: (a: number, b: number, t: number) => a * (1 - t) + b * t,
  };
  const make = new Function(...Object.keys(builtIns), `${js}\nreturn { seamless, polarCap, uGradient };`);
  return make(...Object.values(builtIns));
}

describe('the sampling gradients (seam and poles)', () => {
  const { seamless, polarCap, uGradient } = gradientHelpers();
  const patched = sampleBySpherePoint(ShaderLib.lambert.vertexShader, ShaderLib.lambert.fragmentShader).fragmentShader;

  it('across the 180° meridian takes the shifted longitude’s small step, not the wrap’s near-whole turn', () => {
    // u jumps from 0.999 to 0.001 between two pixels; the copy shifted by half a turn moves by 0.002.
    expect(seamless(-0.998, 0.002)).toBeCloseTo(0.002, 9);
    expect(seamless(0.998, -0.002)).toBeCloseTo(-0.002, 9);
    // Away from the seam the shifted copy is the one wrapping at u = 0.5: the plain step stays.
    expect(seamless(0.002, -0.998)).toBeCloseTo(0.002, 9);
    expect(seamless(-0.003, 0.997)).toBeCloseTo(-0.003, 9);
  });

  it('caps the longitude’s gradient by the latitude’s only near the poles', () => {
    expect(polarCap(0, 0.001, 0.002)).toBe(1);
    expect(polarCap(0.93, 0.001, 0.002)).toBe(1);
    expect(polarCap(-0.99, 0.001, -0.002)).toBeCloseTo(0.002, 9);
    expect(polarCap(1, -0.004, 0.002)).toBeCloseTo(0.004, 9);
    const between = polarCap(-0.96, 0.001, 0.002);
    expect(between).toBeGreaterThan(0.002);
    expect(between).toBeLessThan(1);
  });

  it('clamps the seamless longitude step to the cap', () => {
    expect(uGradient(0.3, -0.7, 0.01)).toBeCloseTo(0.01, 9);
    expect(uGradient(-0.3, 0.7, 0.01)).toBeCloseTo(-0.01, 9);
    expect(uGradient(-0.998, 0.002, 1)).toBeCloseTo(0.002, 9);
    expect(uGradient(0.004, -0.996, 1)).toBeCloseTo(0.004, 9);
  });

  it('is what the fragment samples with, for both screen axes', () => {
    expect(patched).toContain(GRADIENT_GLSL);
    expect(patched).toContain('float cap = polarCap( p.y, dvx, dvy );');
    expect(patched).toContain('vec2 gx = vec2( uGradient( dFdx( uv.x ), dFdx( shifted ), cap ), dvx );');
    expect(patched).toContain('vec2 gy = vec2( uGradient( dFdy( uv.x ), dFdy( shifted ), cap ), dvy );');
  });
});
