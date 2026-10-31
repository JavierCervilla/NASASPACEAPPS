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
import { sampleBySpherePoint } from '../src/globe/pole-uv';

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
