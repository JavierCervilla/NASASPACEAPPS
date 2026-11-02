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
 * The sky placed at the instant (VENT-34), and where the Sun's light
 * falls: the tile's shadows per vertex (sun-shade.ts), and the factors of
 * sun-mask.ts from what hides the Sun (ridge.ts): the far horizon darkens
 * the whole view, a ridge in reach only what it shades.
 */
import type { BufferAttribute, Vector3 } from 'three';
import type { HorizonProfile } from '@ventana/sim';
import { blockerOf, ridgeAlong } from '../ridge';
import { sunLit } from '../sun-shade';
import { nearestSample } from '../tile-sample';
import { direction } from '../view-camera';
import type { PlacedTile, SkyDirs } from './scene-types';
import { EARTH_M, SUN_M, type SkyParts } from './sky';
import type { SunMask } from './sun-mask';

/** How far the light stands from the point, metres. */
const LIGHT_M = 600;

/** Moves the Sun, the Earth and the light to `sky`'s directions. */
export function placeSky(parts: SkyParts, sky: SkyDirs): void {
  const [sx, sy, sz] = direction(sky.sunAz, sky.sunEl);
  const [ex, ey, ez] = direction(sky.earthAz, sky.earthEl);
  parts.sun.position.set(sx * SUN_M, sy * SUN_M, sz * SUN_M);
  parts.sun.lookAt(0, 0, 0);
  parts.earth.position.set(ex * EARTH_M, ey * EARTH_M, ez * EARTH_M);
  const sunUniform = parts.earth.material.uniforms['uSun'];
  (sunUniform?.value as Vector3 | undefined)?.set(sx, sy, sz);
  parts.light.position.set(sx * LIGHT_M, sy * LIGHT_M, sz * LIGHT_M);
  parts.light.target.position.set(0, 0, 0);
  parts.light.target.updateMatrixWorld();
}

export interface Shading {
  readonly tiles: readonly PlacedTile[];
  readonly lit: (key: string) => BufferAttribute | undefined;
  readonly profile: HorizonProfile | null;
  readonly mask: SunMask;
}

/** Shades every tile from `sky`'s Sun and sets the mask's factors. */
export function shadeSun(shading: Shading, sky: SkyDirs): void {
  const sun = { azDeg: sky.sunAz, elDeg: sky.sunEl };
  let centre = 1;
  for (const placed of shading.tiles) {
    const lit = sunLit(placed.tile, placed.ys, sun);
    const attribute = shading.lit(placed.tile.key);
    if (attribute) {
      (attribute.array as Float32Array).set(lit);
      attribute.needsUpdate = true;
    }
    if (placed === shading.tiles[0]) {
      centre = lit[nearestSample(placed.tile, 0, 0)] ?? 1;
    }
  }
  const first = shading.tiles[0];
  const ridge = first ? ridgeAlong(first.tile, first.ys, sun.azDeg) : null;
  const blocker = ridge ? blockerOf(sun, ridge, shading.profile) : null;
  shading.mask.far.value = blocker?.kind === 'far' ? 0 : 1;
  shading.mask.near.value = shading.mask.far.value * centre;
}
