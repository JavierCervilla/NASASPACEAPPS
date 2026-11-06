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
 * Where the Sun's light reaches (VENT-34): the mask is the Sun's, per
 * vertex on the tile (sun-shade.ts, the ridges within it), times a factor
 * for the terrain beyond the tile (the far horizon hides the Sun from the
 * whole view), and for the objects near the point the point's own value.
 *
 * The Sun is the first of three directional lights (the Earth's light and
 * the bounce, or the night's reading light, are the others: sky.ts). By
 * day the mask multiplies all the direct light, as the small shadows'
 * fill was tuned with (VENT-64). At night (VENT-100) it multiplies the
 * Sun's alone, through a wrapper of `RE_Direct` (three's, or the ground's
 * lunar one, which it wraps since it is inserted after it): masking all
 * of it had put out the Earth's light, the only light of the night.
 */
import type { Material } from 'three';

/** The uniforms the masked materials share. */
export interface SunMask {
  /** The far horizon: 0 when it hides the Sun, else 1. */
  readonly far: { value: number };
  /** The objects near the point: its own value times `far`. */
  readonly near: { value: number };
  /** 1 when the Sun is under the point's horizon, else 0. */
  readonly night: { value: number };
}

export const createSunMask = (): SunMask => ({
  far: { value: 1 },
  near: { value: 1 },
  night: { value: 0 },
});

const DIRECT = '#include <lights_fragment_end>';
const PARS = '#include <lights_physical_pars_fragment>';

/** At night, `factor` on the first directional light (the Sun) alone. */
const sunOnly = (factor: string): string => `
void RE_Direct_SunMasked(IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
#if NUM_DIR_LIGHTS > 0
  if (uSunNight > 0.5 && dot(directLight.direction, directionalLights[0].direction) > 0.99999) directLight.color *= ${factor};
#endif
  RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
}
#undef RE_Direct
#define RE_Direct RE_Direct_SunMasked
`;

/** The fragment shader `source` with the Sun masked by `factor`. */
function maskedFragment(source: string, factor: string, varying: string) {
  const byDay = `mix(${factor}, 1.0, uSunNight)`;
  return source
    .replace('#include <common>', `#include <common>\n${varying
    }uniform float uSunMask;\nuniform float uSunNight;`)
    .replace(PARS, `${PARS}\n${sunOnly(factor)}`)
    .replace(DIRECT, `${DIRECT}
        reflectedLight.directDiffuse *= ${byDay};
        reflectedLight.directSpecular *= ${byDay};`);
}

/**
 * Masks `material`'s direct light by the vertex attribute `lit` and the
 * far factor (the tile), or by the near factor (an object).
 */
export function maskSun(
  material: Material,
  mask: SunMask,
  byVertex: boolean,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uSunMask'] = byVertex ? mask.far : mask.near;
    shader.uniforms['uSunNight'] = mask.night;
    const varying = byVertex ? 'varying float vLit;\n' : '';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${varying}${
        byVertex ? 'attribute float lit;' : ''}`)
      .replace('#include <begin_vertex>',
        `#include <begin_vertex>\n${byVertex ? 'vLit = lit;' : ''}`);
    const factor = byVertex ? 'vLit * uSunMask' : 'uSunMask';
    shader.fragmentShader = maskedFragment(shader.fragmentShader, factor,
      varying);
  };
  material.customProgramCacheKey = () => (byVertex ? 'sun-tile' : 'sun-near');
}
