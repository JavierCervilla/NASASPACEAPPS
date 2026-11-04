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
 * The regolith's shading (VENT-34, VENT-62): a patch of the ground material's
 * fragment shader that keeps the 1K photographed regolith from reading as
 * a repeating tile. The albedo and the normal map are each read twice, the
 * second time turned and at another scale, and blended by a slow noise;
 * a second noise varies the brightness by a few percent over tens of
 * metres; and as one repeat of the photograph shrinks on the screen (its
 * footprint, by `fwidth`, not its distance) both settle to the mean, so the
 * far ground does not shimmer. The albedo is made neutral grey: the
 * photographs are CC0 scans with a brown cast the Moon's regolith does not
 * have (Apollo photographs, VENT-62). All in the texture coordinates, which
 * are metres over the texture's size (ring-geometry.ts).
 */
import { ShaderChunk, type WebGLProgramParametersWithUniforms } from 'three';
import { FULL_GROUND, type GroundPolicy } from '../ground-policy';
import { GRAIN_M } from './ring-geometry';

/** One repeat of the photograph this many pixels across is full detail... */
export const FOOT_FULL_PX = 48;
/** ...and this many, the mean: between, the grain fades. */
export const FOOT_NONE_PX = 16;
/** The albedo map's mean, linear, that the far ground settles to. */
const FAR_ALBEDO = 0.28;
/** Brightness blotches: 1 ± MACRO_SPAN / 2 (3 %); the first cut had ±24 %. */
export const MACRO_BASE = 0.97;
export const MACRO_SPAN = 0.06;
/** 0 keeps only the albedo's luminance (neutral grey), 1 its colour. */
export const REGOLITH_SATURATION = 0;

/** How far the grain starts to fade, and is gone, by distance, metres. */
const FADE_FROM_M = 10;
const FADE_TO_M = 140;
/** The line three's `normal_fragment_maps` chunk reads the map with. */
export const NORMAL_READ =
  'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;';
const f = (v: number): string => v.toFixed(1);

const COMMON = `
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Read once per fragment by the albedo and shared with the normal: the
// hash noise and the fade cost the same each time they are asked.
float gBlend = 0.0;
float gFade = 0.0;
const mat2 TURN = mat2(0.8, -0.6, 0.6, 0.8);
float blendOf(vec2 uv) { return smoothstep(0.35, 0.65, vnoise(uv * 0.11 + 3.1)); }
vec2 otherUv(vec2 uv) { return TURN * uv * 0.37 + vec2(0.31, 0.77); }`;

/** The fade by the footprint of one repeat (the high tier's, VENT-62). */
const FOOTPRINT = `
#ifdef USE_MAP
float footMpp() {
  vec2 du = dFdx(vMapUv) * ${f(GRAIN_M)};
  vec2 dv = dFdy(vMapUv) * ${f(GRAIN_M)};
  return sqrt(max(abs(du.x * dv.y - du.y * dv.x), 1e-12));
}
float farFade() {
  return 1.0 - smoothstep(${f(FOOT_NONE_PX)}, ${f(FOOT_FULL_PX)}, ${f(GRAIN_M)} / footMpp());
}
#else
float farFade() { return 0.0; }
#endif`;

/** The fade by distance, with no derivatives (before VENT-62). */
const DISTANCE = `
float farFade() { return smoothstep(${f(FADE_FROM_M)}, ${f(FADE_TO_M)}, length(vViewPosition)); }`;

const TILED = `
vec3 tiledNormal(sampler2D t, vec2 uv) {
  vec3 a = texture2D(t, uv).xyz * 2.0 - 1.0;
  vec3 b = texture2D(t, otherUv(uv)).xyz * 2.0 - 1.0;
  b.xy = b.xy * TURN;
  vec3 n = mix(a, b, gBlend);
  n.xy *= 1.0 - 0.85 * gFade;
  return n;
}`;

/** The line that reads the normal once the anti-tiling took it over. */
export const TILED_READ = 'vec3 mapN = tiledNormal(normalMap, vNormalMapUv);';

const MAP = `
#ifdef USE_MAP
  gBlend = blendOf(vMapUv);
  gFade = farFade();
  vec4 sampledDiffuseColor = mix(texture2D(map, vMapUv),
    texture2D(map, otherUv(vMapUv)), gBlend);
  float regolithLuma = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  sampledDiffuseColor.rgb = mix(vec3(regolithLuma), sampledDiffuseColor.rgb,
    ${REGOLITH_SATURATION.toFixed(2)});
  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb,
    vec3(${FAR_ALBEDO}), gFade * 0.7);
  float macro = vnoise(vMapUv * 0.05) * 0.6 + vnoise(vMapUv * 0.19 + 7.3) * 0.4;
  diffuseColor *= sampledDiffuseColor * (${MACRO_BASE} + ${MACRO_SPAN} * macro);
#endif`;

/** `source` with the one `find` replaced; throws when it is not there. */
export function replaceOnce(
  source: string,
  find: string,
  by: string,
): string {
  if (!source.includes(find)) throw new Error(`ground shader: no «${find}»`);
  return source.replace(find, () => by);
}

/**
 * Patches `shader` (a MeshStandardMaterial's) for the regolith, as far as
 * `policy` allows (ground-policy.ts): the second normal read and the fade
 * by footprint are the high tier's. three has not expanded the `#include`s
 * yet when this runs, so the normal chunk is expanded here to reach the
 * line inside it.
 */
export function antiTile(
  shader: WebGLProgramParametersWithUniforms,
  policy: GroundPolicy = FULL_GROUND,
): void {
  let source = shader.fragmentShader;
  source = replaceOnce(source, '#include <normal_fragment_maps>',
    ShaderChunk.normal_fragment_maps);
  if (policy.antitile) source = replaceOnce(source, NORMAL_READ, TILED_READ);
  const helpers = COMMON + (policy.footprint ? FOOTPRINT : DISTANCE)
    + (policy.antitile ? TILED : '');
  source = replaceOnce(source, '#include <uv_pars_fragment>',
    `#include <uv_pars_fragment>\n${helpers}`);
  shader.fragmentShader = replaceOnce(source, '#include <map_fragment>', MAP);
}
