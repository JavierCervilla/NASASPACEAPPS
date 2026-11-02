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
 * The regolith's shading (VENT-34): a patch of the ground material's
 * fragment shader that keeps the 1K photographed regolith from reading as
 * a repeating tile. The albedo and the normal map are each read twice, the
 * second time turned and at another scale, and blended by a slow noise;
 * a second, slower noise varies the brightness over tens of metres; and
 * with distance both settle to the mean, so the far ground does not
 * shimmer. All in the texture coordinates, which are metres over the
 * texture's size (ground.ts).
 */
import type { WebGLProgramParametersWithUniforms } from 'three';

/** How far the grain starts to fade, and is gone, metres. */
const FADE_FROM_M = 10;
const FADE_TO_M = 140;
/** The albedo map's mean, linear, that the far ground settles to. */
const FAR_ALBEDO = 0.28;

const HELPERS = `
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
const mat2 TURN = mat2(0.8, -0.6, 0.6, 0.8);
float blendOf(vec2 uv) { return smoothstep(0.35, 0.65, vnoise(uv * 0.11 + 3.1)); }
float farFade() { return smoothstep(${FADE_FROM_M.toFixed(1)}, ${FADE_TO_M.toFixed(1)}, length(vViewPosition)); }
vec2 otherUv(vec2 uv) { return TURN * uv * 0.37 + vec2(0.31, 0.77); }
vec3 tiledNormal(sampler2D t, vec2 uv) {
  vec3 a = texture2D(t, uv).xyz * 2.0 - 1.0;
  vec3 b = texture2D(t, otherUv(uv)).xyz * 2.0 - 1.0;
  b.xy = b.xy * TURN;
  vec3 n = mix(a, b, blendOf(uv));
  n.xy *= 1.0 - 0.85 * farFade();
  return n;
}`;

const MAP = `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = mix(texture2D(map, vMapUv),
    texture2D(map, otherUv(vMapUv)), blendOf(vMapUv));
  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb,
    vec3(${FAR_ALBEDO}), farFade() * 0.7);
  float macro = vnoise(vMapUv * 0.05) * 0.6 + vnoise(vMapUv * 0.19 + 7.3) * 0.4;
  diffuseColor *= sampledDiffuseColor * (0.78 + 0.5 * macro);
#endif`;

/** Patches `shader` (a MeshStandardMaterial's) for the regolith. */
export function antiTile(shader: WebGLProgramParametersWithUniforms): void {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${HELPERS}`)
    .replace('#include <map_fragment>', MAP)
    .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      'vec3 mapN = tiledNormal(normalMap, vNormalMapUv);');
}
