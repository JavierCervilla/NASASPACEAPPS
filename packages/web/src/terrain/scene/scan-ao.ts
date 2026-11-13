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
 * Contact occlusion on the scanned rocks (VENT-124), as the stones bake it
 * per vertex (stones.ts `contactAo`): a surface darkens to 0.3 as it nears
 * the ground it sits on. A scan's vertices are shared by every instance, so
 * the darkening is worked out in the vertex shader from the vertex's world
 * height over the instance's ground (`groundY`, one per instance, the
 * ground under the rock's centre: a rock spans centimetres of it).
 */
import type { MeshStandardMaterial } from 'three';
import { OPEN_M, SHUT_AO } from '../stones';
import { glslFloat } from './glsl-float';

/** The vertex shader's work: the open share, then the stones' curve. */
const VERTEX = `
  vec4 aoAt = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  float aoOpen = clamp((aoAt.y - groundY) / ${glslFloat(OPEN_M)}, 0.0, 1.0);
  vContactAo = ${glslFloat(SHUT_AO)} + ${glslFloat(1 - SHUT_AO)}
    * aoOpen * aoOpen * (3.0 - 2.0 * aoOpen);`;

/** Adds the contact occlusion to `material`, after what it already does. */
export function withContactAo(material: MeshStandardMaterial): void {
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float groundY;
varying float vContactAo;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>${VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vContactAo;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb *= vContactAo;`);
  };
  material.customProgramCacheKey = () => 'scan-rock-ao';
}
