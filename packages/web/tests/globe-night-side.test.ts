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

import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { darkenNightSide, NIGHT_FADE } from '../src/globe/night-side';

describe('night side under the relief', () => {
  const patched = darkenNightSide(ShaderLib.lambert.fragmentShader);

  it('scales direct sunlight by the fade of the unperturbed sphere normal', () => {
    expect(patched).toContain('vec3 sphereNormal;');
    expect(patched).toContain('sphereNormal = nonPerturbedNormal;');
    expect(patched).toContain(
      'float dotNL = saturate( dot( geometryNormal, directLight.direction ) ) * ' +
        'smoothstep( -0.080, 0.000, dot( sphereNormal, directLight.direction ) );',
    );
  });

  it('reads the sphere normal after the normal map, before the lights', () => {
    const set = patched.indexOf('sphereNormal = nonPerturbedNormal;');
    expect(set).toBeGreaterThan(patched.indexOf('#include <normal_fragment_maps>'));
    expect(set).toBeLessThan(patched.indexOf('#include <lights_fragment_begin>'));
  });

  it('leaves the lit side alone: the fade is 1 from the terminator on', () => {
    expect(NIGHT_FADE.to).toBe(0);
    expect(NIGHT_FADE.from).toBeLessThan(0);
  });

  it('fails loudly if Three.js changes the lines it patches', () => {
    expect(() => darkenNightSide('void main() {}')).toThrow('Lambert shader changed');
  });
});
