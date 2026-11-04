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
 * The fine relief in the ground's shader (VENT-62): the NAC slope replaces
 * the mesh's own where the tile covers, by the feather's weight.
 */
import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { FINE_SITES } from '../src/terrain/fine/fine-catalog';
import type { FineView } from '../src/terrain/fine/fine-relief';
import { antiTile } from '../src/terrain/scene/ground-shader';
import { createFineUniforms, patchFine, setFine } from '../src/terrain/scene/ground-fine';

type Shader = Parameters<typeof antiTile>[0];
const patched = () => {
  const shader = { fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} } as unknown as Shader;
  antiTile(shader);
  patchFine(shader, createFineUniforms());
  return shader;
};
const VIEW: FineView = { site: FINE_SITES[0]!, size: 4,
  texels: new Uint8Array(4 * 4 * 4).fill(128),
  affine: { x0: 77110, y0: 138000, xe: 1, ye: 0, xn: 0, yn: 1 } };

describe('patchFine', () => {
  it('reads the tile after the tiled normal and registers its uniforms', () => {
    const shader = patched();
    expect(shader.fragmentShader).toMatch(/tiledNormal\(normalMap, vNormalMapUv\);[^]*fineSlope/);
    expect(Object.keys(shader.uniforms).sort()).toEqual(
      ['uFineBox', 'uFineTex', 'uPlaneE', 'uPlaneN', 'uPlaneO']);
  });
});

describe('setFine', () => {
  it('turns the tile on with a texture, and off with null', () => {
    const u = createFineUniforms();
    expect(u.uFineBox.value.w).toBe(0);
    setFine(u, VIEW);
    expect(u.uFineBox.value.w).toBe(1);
    expect(u.uFineBox.value.x).toBe(VIEW.site.ulx);
    expect((u.uFineTex.value?.image as { width: number }).width).toBe(4);
    expect(u.uPlaneO.value.x).toBe(77110);
    setFine(u, null);
    expect(u.uFineBox.value.w).toBe(0);
    expect(u.uFineTex.value).toBeNull();
  });
});
