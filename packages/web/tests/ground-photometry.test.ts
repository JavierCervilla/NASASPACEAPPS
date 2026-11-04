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
import { LUNAR_NORM, L_FLOOR, MCEWEN, SHOE } from '../src/terrain/lunar-photometry';
import { patchPhotometry } from '../src/terrain/scene/ground-photometry';

const patched = (): string => {
  const shader = { fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} } as unknown as Parameters<typeof patchPhotometry>[0];
  patchPhotometry(shader);
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

  it('carries the twin\'s constants', () => {
    const source = patched();
    for (const v of [...MCEWEN, SHOE.b0, SHOE.h, LUNAR_NORM, L_FLOOR]) {
      expect(source).toContain(String(v));
    }
  });
});
