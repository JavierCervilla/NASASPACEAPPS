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
 * The lander's environment (VENT-46): a dim, cool hemisphere, the Earth's
 * light off a sky that is black. Without an environment three.js shades
 * metal as black, and the foil and struts are metal. A PMREM of it cost
 * about nine seconds of start-up on a software rasteriser (its shaders
 * compile and its cube faces render), so the hemisphere is evaluated in
 * the lander's own fragment shader instead: the reflected direction picks
 * a colour from three stops and the roughness flattens it toward the
 * horizon's. No texture, no pass, no extra program. Set on the lander's
 * materials only: the regolith has no use for it.
 */
import type { Material } from 'three';

/** Linear colours of the dome: overhead, at the horizon, under the feet. */
const DOME = {
  zenith: [0.2, 0.3, 0.52],
  horizon: [0.07, 0.09, 0.14],
  ground: [0.025, 0.025, 0.03],
} as const;

/** How much of the dome the metal reflects: dim, it is the Earth. */
const INTENSITY = 0.6;
/** A fully rough surface sees this share of the horizon colour only. */
const ROUGH_FLATTENING = 0.85;

const vec3 = (v: readonly number[]): string =>
  `vec3(${v.map((x) => x.toFixed(3)).join(', ')})`;

const RADIANCE_FN = `
vec3 earthshine(vec3 reflected, float roughness) {
  float h = dot(reflected, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
  h *= 1.0 - roughness * ${ROUGH_FLATTENING.toFixed(2)};
  vec3 up = mix(${vec3(DOME.horizon)}, ${vec3(DOME.zenith)}, sqrt(max(h, 0.0)));
  vec3 down = mix(${vec3(DOME.horizon)}, ${vec3(DOME.ground)}, sqrt(max(-h, 0.0)));
  return (h >= 0.0 ? up : down) * ${INTENSITY.toFixed(2)};
}`;

const MAPS = '#include <lights_fragment_maps>';

/**
 * Adds the earthshine to `material`'s indirect specular, after whatever
 * `onBeforeCompile` it already has (the Sun's mask).
 */
export function lightWithEarthshine(material: Material): void {
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${RADIANCE_FN}`)
      .replace(MAPS, `${MAPS}
        radiance += earthshine(reflect(-geometryViewDir, geometryNormal),
          material.roughness);`);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${key.call(material)}-earthshine`;
}
