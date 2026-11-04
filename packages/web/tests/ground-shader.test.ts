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
 * The regolith's shader patch (VENT-34, VENT-62): it has to land on the
 * source three really compiles. three expands `#include` after
 * `onBeforeCompile`, so a replacement that looks for a line inside a chunk
 * never matched in production (VENT-62 found it).
 */
import { ShaderLib } from 'three';
import { groundPolicy } from '../src/terrain/ground-policy';
import { describe, expect, it } from 'vitest';
import {
  MACRO_BASE,
  MACRO_SPAN,
  NORMAL_READ,
  REGOLITH_SATURATION,
  antiTile,
} from '../src/terrain/scene/ground-shader';

const patched = (policy = groundPolicy('high', new Set())): string => {
  const shader = { fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} } as unknown as Parameters<typeof antiTile>[0];
  antiTile(shader, policy);
  return shader.fragmentShader;
};

describe('antiTile on the physical material\'s fragment shader', () => {
  it('replaces the normal map read with the tiled one', () => {
    const source = patched();
    expect(source).toContain('tiledNormal(normalMap, vNormalMapUv)');
    expect(source).not.toContain(
      'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;');
  });

  it('replaces the albedo read with the blended one', () => {
    const source = patched();
    expect(source).toContain('sampledDiffuseColor');
    expect(source).not.toContain('#include <map_fragment>');
  });

  it('leaves no include of the chunk it expanded', () => {
    expect(patched()).not.toContain('#include <normal_fragment_maps>');
  });

  it('fades the grain by the footprint of a repeat, not by distance', () => {
    const source = patched();
    expect(source).toContain('dFdx(vMapUv)');
    expect(source).not.toContain('length(vViewPosition)');
  });
});

describe('antiTile at the lower tiers (VENT-69)', () => {
  const medium = (): string => patched(groundPolicy('medium', new Set()));

  it('reads the normal map once, as before VENT-62', () => {
    const source = medium();
    expect(source).toContain(NORMAL_READ);
    expect(source).not.toContain('tiledNormal');
  });

  it('fades the grain by distance, with no derivatives of its own', () => {
    const source = medium();
    expect(source).toContain('length(vViewPosition)');
    expect(source).not.toContain('footMpp');
    expect(source).not.toContain('dFdx(vMapUv)');
  });

  it('still blends the albedo and keeps the neutral grey', () => {
    const source = medium();
    expect(source).toContain('otherUv(vMapUv)');
    expect(source).toContain('regolithLuma');
  });

  it('takes each high-tier part out on its own word', () => {
    const high = (word: string): string =>
      patched(groundPolicy('high', new Set([word as 'fine'])));
    expect(high('antitile')).not.toContain('tiledNormal');
    expect(high('antitile')).toContain('dFdx(vMapUv)');
    expect(high('footprint')).toContain('tiledNormal(normalMap');
    expect(high('footprint')).not.toContain('dFdx(vMapUv)');
  });
});

describe('the regolith\'s look', () => {
  it('keeps the brightness blotches to a few percent', () => {
    expect(MACRO_SPAN / 2).toBeLessThanOrEqual(0.05);
    expect(MACRO_BASE + MACRO_SPAN / 2).toBeCloseTo(1, 2);
  });

  it('is neutral grey: no colour of the photograph stays', () => {
    expect(REGOLITH_SATURATION).toBe(0);
    expect(patched()).toContain('regolithLuma');
  });
});
