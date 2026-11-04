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
 * The ground's Sun in GLSL (VENT-62, VENT-68): the twin of
 * lunar-photometry.ts and hapke.ts, built from their constants. Only the Sun
 * (the first directional light) goes through it; the fill keeps three's own
 * diffuse, and the regolith's specular is off.
 *
 * «Mid-way» small shadows (VENT-64, the human's verdict): the legibility
 * fill (the hemisphere, the Earth's light and the bounce) is scaled by
 * `uDark` wherever something small hides the Sun from a point the Sun
 * reaches (the shadow map, a crater's or a clod's shadow, the vertex mask,
 * a face turned from the Sun), so small shadows land at about 8 to 10 % of
 * the lit ground instead of the 19 to 23 % the lifted fill gave; Apollo's
 * are 2 to 3 %. A view the Sun does not reach at all (`uSunHere` 0) keeps
 * the full fill, so it stays legible.
 */
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import { DIFFUSE_R0, HAPKE } from '../hapke';
import {
  FLOOR_FROM_DEG,
  FLOOR_GAIN,
  FLOOR_LAMBERT,
  FLOOR_LS,
  FLOOR_RAMP_DEG,
  LUNAR_NORM,
  PEAK_SMOOTH_DEG,
} from '../lunar-photometry';
import { glslFloat as g } from './glsl-float';
import { replaceOnce } from './ground-shader';

/** The fill's scale in a small shadow: 0.62 puts them near 9 %. */
export const DARK_SMALL_SHADOWS = 0.62;

/** The fill's uniforms, shared by the ground's materials. */
export interface FillUniforms {
  readonly uDark: IUniform<number>;
  /** 1 when the Sun reaches the point, else 0. */
  readonly uSunHere: IUniform<number>;
}

export const createFillUniforms = (): FillUniforms => ({
  uDark: { value: DARK_SMALL_SHADOWS },
  uSunHere: { value: 1 },
});

const FILL_GLSL = `
// The Sun's share a shadow of the micro-relief leaves; written before the lights.
float gSunShade = 1.0;
// How much of the Sun reaches the point, for the fill's scale.
float gSunVis = 1.0;
uniform float uDark;
uniform float uSunHere;
float groundDark() {
  return mix(1.0, uDark, clamp(1.0 - gSunVis * vLit, 0.0, 1.0) * uSunHere);
}
`;

const HAPKE_GLSL = `
float groundH(float x) {
  float u = max(x, 1e-4);
  return 1.0 / (1.0 - ${g(HAPKE.w)} * u * (${g(DIFFUSE_R0)} + (1.0 - 2.0 * ${g(DIFFUSE_R0)} * u) * 0.5 * log((1.0 + u) / u)));
}
float groundHapke(float mu0, float mu, float gDeg) {
  float t = tan(radians(min(gDeg, 178.0)) * 0.5);
  float z = t / ${g(HAPKE.hC)};
  float backscatter = z < 1e-6 ? 1.0 : (1.0 + (1.0 - exp(-z)) / z) * 0.5 / ((1.0 + z) * (1.0 + z));
  float bs = ${g(HAPKE.bS0)} / (1.0 + t / ${g(HAPKE.hS)});
  float b = ${g(HAPKE.b)};
  float p = (1.0 - b * b) / pow(1.0 + b * b - 2.0 * b * cos(radians(gDeg)), 1.5);
  float scatter = (1.0 + bs) * p + groundH(mu0) * groundH(mu) - 1.0;
  return mu0 / (mu0 + mu + 1e-3) * scatter * (1.0 + ${g(HAPKE.bC0)} * backscatter);
}
float groundSun(float mu0, float mu, float alpha) {
  float aSmooth = sqrt(alpha * alpha + ${g(PEAK_SMOOTH_DEG * PEAK_SMOOTH_DEG)});
  float hapke = groundHapke(mu0, mu, aSmooth) * ${g(LUNAR_NORM)};
  float floorR = ${g(FLOOR_GAIN)} * mu0 * (${g(FLOOR_LAMBERT)} + ${g(FLOOR_LS)} / (mu0 + mu + 1e-3));
  float w = smoothstep(${g(FLOOR_FROM_DEG)}, ${g(FLOOR_FROM_DEG + FLOOR_RAMP_DEG)}, alpha);
  return mix(hapke, max(hapke, floorR), w);
}
`;

const LUNAR = `${FILL_GLSL}${HAPKE_GLSL}
void RE_Direct_Ground(const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
#if NUM_DIR_LIGHTS > 0
  if (dot(directLight.direction, directionalLights[0].direction) > 0.99999) {
    float mu0 = saturate(dot(geometryNormal, directLight.direction));
    float mu = saturate(dot(geometryNormal, geometryViewDir));
    float c = clamp(dot(directLight.direction, geometryViewDir), -0.9995, 1.0);
    float r = mu0 > 0.0 ? groundSun(mu0, mu, degrees(acos(c))) : 0.0;
    float shadowMap = dot(directLight.color, vec3(1.0)) / max(dot(directionalLights[0].color, vec3(1.0)), 1e-6);
    gSunVis = gSunShade * shadowMap * smoothstep(0.0, 0.03, dot(geometryNormal, directLight.direction));
    reflectedLight.directDiffuse += directLight.color * gSunShade * r * BRDF_Lambert(material.diffuseContribution);
    return;
  }
#endif
  IncidentLight fill = directLight;
  fill.color *= groundDark();
  RE_Direct_Physical(fill, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
}
#undef RE_Direct
#define RE_Direct RE_Direct_Ground
`;

const FILL_END = '#include <lights_fragment_end>';

/** Puts the lunar Sun on `shader` (the ground's, after antiTile). */
export function patchPhotometry(
  shader: WebGLProgramParametersWithUniforms,
  fill: FillUniforms,
): void {
  Object.assign(shader.uniforms, fill);
  const chunk = '#include <lights_physical_pars_fragment>';
  const lunar = replaceOnce(shader.fragmentShader, chunk,
    `${chunk}\n${LUNAR}`);
  shader.fragmentShader = replaceOnce(lunar, FILL_END,
    `${FILL_END}\n  reflectedLight.indirectDiffuse *= groundDark();`);
}
