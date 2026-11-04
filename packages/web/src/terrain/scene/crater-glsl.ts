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
 * The crater patch in the ground's shader (VENT-64). The patch and the
 * rings' ground share one material (maps, photometry, mask) in two
 * variants: the rings' cuts out the patch's disc, in the colour pass and in
 * the shadow's depth pass, so the two never draw the same ground; the
 * patch's adds the craters' slope (`cslope`) to the shading normal after
 * the fine relief has set its own, since that one replaces the mesh's slope
 * and would eat the craters' (ground-fine.ts).
 */
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import { replaceOnce } from './ground-shader';

/** The disc the patch covers: its radius squared, or -1 for none. */
export interface CraterUniforms {
  readonly uHoleR2: IUniform<number>;
}

const WORLD = 'varying vec3 vCraterW;';
const HOLE = 'if (uHoleR2 > 0.0 && dot(vCraterW.xz, vCraterW.xz) < uHoleR2) discard;';

/** The vertex shader's world position, and the slope on the patch's. */
export function vertex(source: string, patch: boolean): string {
  const slope = patch ? '\nattribute vec2 cslope;\nvarying vec2 vCSlope;' : '';
  const take = patch ? '\nvCSlope = cslope;' : '';
  const declared = replaceOnce(source, '#include <common>',
    `#include <common>\n${WORLD}${slope}`);
  return replaceOnce(declared, '#include <project_vertex>',
    `#include <project_vertex>\nvCraterW = (modelMatrix * vec4(transformed, 1.0)).xyz;${take}`);
}

/** The rings' variant: cut out the patch's disc. */
export function ringFragment(source: string): string {
  const declared = replaceOnce(source, '#include <common>',
    `#include <common>\n${WORLD}\nuniform float uHoleR2;`);
  return replaceOnce(declared, 'void main() {', `void main() {\n  ${HOLE}`);
}

/** The patch's variant: the craters' slope on the normal. */
function patchFragment(source: string): string {
  const declared = replaceOnce(source, '#include <common>',
    `#include <common>\n${WORLD}\nvarying vec2 vCSlope;`);
  return replaceOnce(declared, 'mapN.xy *= normalScale;',
    'mapN.xy -= vCSlope / normalScale;\n  mapN.xy *= normalScale;');
}

/**
 * Patches the ground's shader for the crater patch: the patch's variant
 * when `patch`, else the rings' (which gets `uniforms` for the cut-out).
 * Run after antiTile, which expands the normal chunk the slope goes in.
 */
export function patchCraters(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: CraterUniforms,
  patch: boolean,
): void {
  shader.vertexShader = vertex(shader.vertexShader, patch);
  if (patch) {
    shader.fragmentShader = patchFragment(shader.fragmentShader);
    return;
  }
  shader.uniforms['uHoleR2'] = uniforms.uHoleR2;
  shader.fragmentShader = ringFragment(shader.fragmentShader);
}
