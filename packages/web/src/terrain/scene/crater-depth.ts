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
 * The rings' shadow depth without the crater patch's disc (VENT-64), and
 * the cut-out's uniform. The patch and the rings' ground must not both
 * cast: the same ground twice makes acne against the sun map.
 */
import { MeshDepthMaterial } from 'three';
import { ringFragment, vertex, type CraterUniforms } from './crater-glsl';

export const createCraterUniforms = (): CraterUniforms => ({
  uHoleR2: { value: -1 },
});

/** The rings' shadow depth, without the patch's disc. */
export function ringDepthMaterial(uniforms: CraterUniforms): MeshDepthMaterial {
  const material = new MeshDepthMaterial();
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uHoleR2'] = uniforms.uHoleR2;
    shader.vertexShader = vertex(shader.vertexShader, false);
    shader.fragmentShader = ringFragment(shader.fragmentShader);
  };
  material.customProgramCacheKey = () => 'crater-hole-depth';
  return material;
}
