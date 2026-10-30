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
 * Keeps the Moon's night side dark under the LOLA relief. The normal map
 * tilts each pixel's normal, so a crater rim past the terminator can face
 * the Sun while the ground it stands on does not, and it would glow far
 * into the night. Direct sunlight is therefore also scaled by the smooth
 * step of the sphere's own normal against the Sun: 1 wherever the ground
 * is lit, so the relief there is untouched, fading to 0 just past the
 * terminator. Patched into MeshLambertMaterial's shader.
 */
import { ShaderChunk, type Material } from 'three';

/** The night-side fade, in cos(angle) between the sphere and the Sun. */
export const NIGHT_FADE = { from: -0.08, to: 0 } as const;

const DOT_NL =
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
const NORMAL_MAPS = '#include <normal_fragment_maps>';
const LAMBERT_PARS = '#include <lights_lambert_pars_fragment>';

/** Lambert's direct light, scaled by the fade of the unperturbed normal. */
function fadedLambert(): string {
  const { from, to } = NIGHT_FADE;
  const fade =
    `smoothstep( ${from.toFixed(3)}, ${to.toFixed(3)}, ` +
    'dot( sphereNormal, directLight.direction ) )';
  const chunk = ShaderChunk.lights_lambert_pars_fragment;
  if (!chunk.includes(DOT_NL)) throw new Error('Lambert chunk changed');
  const faded = DOT_NL.replace(');', `) * ${fade};`);
  return `vec3 sphereNormal;\n${chunk.replace(DOT_NL, faded)}`;
}

/**
 * The Lambert fragment shader `source` with the night-side fade. Throws if
 * Three.js no longer has the lines it patches, so an upgrade is noticed.
 */
export function darkenNightSide(source: string): string {
  if (!source.includes(NORMAL_MAPS) || !source.includes(LAMBERT_PARS)) {
    throw new Error('Lambert shader changed');
  }
  return source
    .replace(LAMBERT_PARS, fadedLambert())
    .replace(NORMAL_MAPS, `${NORMAL_MAPS}\nsphereNormal = nonPerturbedNormal;`);
}

/** Patches `material` (a MeshLambertMaterial) so its night side stays dark. */
export function keepNightDark(material: Material): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = darkenNightSide(shader.fragmentShader);
  };
}
