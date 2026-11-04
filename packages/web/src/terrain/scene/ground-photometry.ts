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
 * The ground's Sun in GLSL (VENT-62): the twin of lunar-photometry.ts,
 * built from its constants. Only the Sun (the first directional light) goes
 * through it; the fill keeps three's own diffuse, and the regolith's
 * specular is off.
 */
import type { WebGLProgramParametersWithUniforms } from 'three';
import {
  LUNAR_NORM,
  L_FLOOR,
  MCEWEN,
  NORMAL_PHASE_DEG,
  SHOE,
} from '../lunar-photometry';
import { replaceOnce } from './ground-shader';

const [M1, M2, M3] = MCEWEN;
const SHOE_AT_NORMAL = 1 + SHOE.b0 /
  (1 + Math.tan((NORMAL_PHASE_DEG * Math.PI) / 360) / SHOE.h);

const LUNAR = `
void RE_Direct_Ground(const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
#if NUM_DIR_LIGHTS > 0
  if (dot(directLight.direction, directionalLights[0].direction) > 0.99999) {
    float mu0 = saturate(dot(geometryNormal, directLight.direction));
    float mu = saturate(dot(geometryNormal, geometryViewDir));
    float c = clamp(dot(directLight.direction, geometryViewDir), -0.9995, 1.0);
    float a = degrees(acos(c));
    float L = clamp(1.0 + a * (${M1} + a * (${M2} + ${M3} * a)), ${L_FLOOR}, 1.0);
    float r = mu0 > 0.0 ? 2.0 * L * mu0 / (mu0 + mu + 1e-3) + (1.0 - L) * mu0 : 0.0;
    float B = 1.0 + ${SHOE.b0} / (1.0 + sqrt((1.0 - c) / (1.0 + c)) / ${SHOE.h});
    reflectedLight.directDiffuse += directLight.color * (r * ${LUNAR_NORM} * B / ${SHOE_AT_NORMAL}) * BRDF_Lambert(material.diffuseContribution);
    return;
  }
#endif
  RE_Direct_Physical(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
}
#undef RE_Direct
#define RE_Direct RE_Direct_Ground
`;

/** Puts the lunar Sun on `shader` (the ground's, after antiTile). */
export function patchPhotometry(
  shader: WebGLProgramParametersWithUniforms,
): void {
  const chunk = '#include <lights_physical_pars_fragment>';
  shader.fragmentShader = replaceOnce(shader.fragmentShader, chunk,
    `${chunk}\n${LUNAR}`);
}
