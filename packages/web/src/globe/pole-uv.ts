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
 * Samples the Moon's maps by each pixel's own point on the sphere instead
 * of the vertices' UVs. A UV sphere meets at each pole in a fan of thin
 * triangles, and interpolating the UVs across them drew the polar rows of
 * the maps as a dark star right at the south pole, under the sites that
 * matter most. Here the fragment works out its equirectangular UV from
 * the sphere point (the same mapping as `SphereGeometry`, so nothing else
 * moves) and samples with explicit gradients: across the 180° meridian
 * the longitude's wrap would otherwise pick the smallest mipmap, and near
 * the poles its gradient is capped by the latitude's, since the maps'
 * polar rows hold one smeared point and the full gradient only blurs a
 * halo. Patched into MeshLambertMaterial's shaders.
 */
import type { Material, WebGLProgramParametersWithUniforms } from 'three';

const BEGIN_VERTEX = '#include <begin_vertex>';
const MAIN = 'void main() {';
const MAP_FRAGMENT = '#include <map_fragment>';
const NORMAL_MAPS = '#include <normal_fragment_maps>';

/** The sphere point, interpolated: on a sphere it never pinches. */
const VARYING = 'varying vec3 vSpherePos;';

/**
 * The gradients' choices, scalar GLSL so tests can run them: across the
 * 180° meridian the longitude's step is the smaller of the plain one and
 * the one of a copy shifted half a turn (whose wrap is at u = 0.5), and
 * near the poles (|y| past 0.94, fully at 0.985) it is capped by the
 * latitude's.
 */
export const GRADIENT_GLSL = `
float seamless( float du, float duShifted ) {
  return abs( duShifted ) < abs( du ) ? duShifted : du;
}
float polarCap( float y, float dvx, float dvy ) {
  float polar = smoothstep( 0.94, 0.985, abs( y ) );
  return mix( 1.0, max( abs( dvx ), abs( dvy ) ), polar );
}
float uGradient( float du, float duShifted, float cap ) {
  return clamp( seamless( du, duShifted ), - cap, cap );
}
`;

/** The UV of `SphereGeometry` at sphere point `p`, sampled with gradients. */
const SAMPLE_SPHERE = `
${VARYING}
vec2 sphereUv( vec3 p ) {
  float u = fract( atan( p.z, - p.x ) * RECIPROCAL_PI2 );
  float v = asin( clamp( p.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
  return vec2( u, v );
}
${GRADIENT_GLSL}
vec4 sampleSphere( sampler2D tex ) {
  vec3 p = normalize( vSpherePos );
  vec2 uv = sphereUv( p );
  float shifted = fract( uv.x + 0.5 );
  float dvx = dFdx( uv.y );
  float dvy = dFdy( uv.y );
  float cap = polarCap( p.y, dvx, dvy );
  vec2 gx = vec2( uGradient( dFdx( uv.x ), dFdx( shifted ), cap ), dvx );
  vec2 gy = vec2( uGradient( dFdy( uv.x ), dFdy( shifted ), cap ), dvy );
  return textureGrad( tex, uv, gx, gy );
}
`;

const MAP_SAMPLE = `
#ifdef USE_MAP
  diffuseColor *= sampleSphere( map );
#endif
`;

const NORMAL_SAMPLE = `
#ifdef USE_NORMALMAP_OBJECTSPACE
  normal = sampleSphere( normalMap ).xyz * 2.0 - 1.0;
  normal = normalize( normalMatrix * normal );
#endif
`;

/** Throws when `source` lacks a line the patch replaces. */
function expectLines(source: string, lines: readonly string[]): void {
  if (lines.some((line) => !source.includes(line))) {
    throw new Error('Lambert shader changed');
  }
}

/**
 * The Lambert shaders with the maps sampled by sphere point. Throws if
 * Three.js no longer has the lines it patches, so an upgrade is noticed.
 */
export function sampleBySpherePoint(vertex: string, fragment: string) {
  expectLines(vertex, [BEGIN_VERTEX, MAIN]);
  expectLines(fragment, [MAIN, MAP_FRAGMENT, NORMAL_MAPS]);
  return {
    vertexShader: vertex
      .replace(MAIN, `${VARYING}\n${MAIN}`)
      .replace(BEGIN_VERTEX, `${BEGIN_VERTEX}\nvSpherePos = position;`),
    fragmentShader: fragment
      .replace(MAIN, `${SAMPLE_SPHERE}\n${MAIN}`)
      .replace(MAP_FRAGMENT, MAP_SAMPLE)
      .replace(NORMAL_MAPS, NORMAL_SAMPLE),
  };
}

/**
 * Adds the patch to `material` after whatever it already patches (the
 * night side, night-side.ts).
 */
export function samplePolesExactly(material: Material): void {
  const before = material.onBeforeCompile.bind(material);
  type Shader = WebGLProgramParametersWithUniforms;
  material.onBeforeCompile = (shader: Shader, renderer) => {
    before(shader, renderer);
    const { vertexShader, fragmentShader } = shader;
    const patched = sampleBySpherePoint(vertexShader, fragmentShader);
    shader.vertexShader = patched.vertexShader;
    shader.fragmentShader = patched.fragmentShader;
  };
}
