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
 * Where the Sun's light reaches (VENT-34): the scene has one directional
 * light, the Sun, and this mask multiplies its direct light: per vertex on
 * the tile (sun-shade.ts, the ridges within it), times a factor for the
 * terrain beyond the tile (the far horizon hides the Sun from the whole
 * view), and for the objects near the point the point's own value. The
 * earthshine and the legibility fill are indirect light, never masked.
 */
import type { Material } from 'three';

/** The uniforms the masked materials share. */
export interface SunMask {
  /** The far horizon: 0 when it hides the Sun, else 1. */
  readonly far: { value: number };
  /** The objects near the point: its own value times `far`. */
  readonly near: { value: number };
}

export const createSunMask = (): SunMask => ({
  far: { value: 1 },
  near: { value: 1 },
});

const DIRECT = '#include <lights_fragment_end>';

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
    const varying = byVertex ? 'varying float vLit;\n' : '';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${varying}${
        byVertex ? 'attribute float lit;' : ''}`)
      .replace('#include <begin_vertex>',
        `#include <begin_vertex>\n${byVertex ? 'vLit = lit;' : ''}`);
    const factor = byVertex ? 'vLit * uSunMask' : 'uSunMask';
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        `#include <common>\n${varying}uniform float uSunMask;`)
      .replace(DIRECT, `${DIRECT}
        reflectedLight.directDiffuse *= ${factor};
        reflectedLight.directSpecular *= ${factor};`);
  };
  material.customProgramCacheKey = () => (byVertex ? 'sun-tile' : 'sun-near');
}
