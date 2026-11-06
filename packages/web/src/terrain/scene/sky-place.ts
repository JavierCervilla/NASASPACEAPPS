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
 * falls: the near ground's shadows per vertex (sun-shade.ts), and the
 * factors of
 * sun-mask.ts from what hides the Sun (ridge.ts): the far horizon darkens
 * the whole view, a ridge in reach only what it shades.
 */
import type { Matrix3, Vector3 } from 'three';
import type { HorizonProfile } from '@ventana/sim';
import { blockerOf, ridgeAlong } from '../ridge';
import { sunLit } from '../sun-shade';
import { nearestSample } from '../tile-sample';
import { direction } from '../view-camera';
import type { PlacedTile, SkyDirs } from './scene-types';
import {
  BOUNCE_COLOUR,
  EARTH_M,
  FILL,
  KEY_INTENSITY,
  SUN_M,
  type SkyParts,
} from './sky';
import { fillLight } from '../sky-light';
import { NIGHT_LIGHT, nightLight } from '../night-light';
import type { SunMask } from './sun-mask';

/** How far the light stands from the point, metres. */
const LIGHT_M = 600;

/**
 * At night (the Sun under the point's horizon), the horizon the Earth's
 * light is read over; null by day.
 */
export type NightOver = { readonly profile: HorizonProfile | null } | null;

/**
 * Moves the Sun, the Earth and the light to `sky`'s directions, with the
 * night's lights when `night` is not null.
 */
export function placeSky(
  parts: SkyParts,
  sky: SkyDirs,
  spin: readonly number[],
  night: NightOver,
): void {
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
  const bodyUniform = parts.earth.material.uniforms['uBody'];
  (bodyUniform?.value as Matrix3 | undefined)?.fromArray(spin as number[])
    .transpose();
  if (night) placeNight(parts, sky, night.profile);
  else placeFill(parts, sky);
}

type Aimed = { readonly toward: readonly number[]; readonly intensity: number };

/** Puts `light` toward `part` at its level, relative to the key. */
function aim(light: SkyParts['bounce'], part: Aimed): void {
  light.position.set(...part.toward.map((c) => c * LIGHT_M) as
    [number, number, number]);
  light.intensity = part.intensity * KEY_INTENSITY;
}

/** Aims the Earth's light and the ground's bounce, and sets their level. */
function placeFill(parts: SkyParts, sky: SkyDirs): void {
  const fill = fillLight(sky);
  aim(parts.earthshine, fill.earthshine);
  aim(parts.bounce, fill.bounce);
  parts.bounce.color.setHex(BOUNCE_COLOUR);
  parts.fill.intensity = FILL.intensity;
}

/** The night's floor, Earth's light and reading light (night-light.ts). */
function placeNight(
  parts: SkyParts,
  sky: SkyDirs,
  profile: HorizonProfile | null,
): void {
  const night = nightLight(sky, profile);
  aim(parts.earthshine, night.earthshine);
  aim(parts.bounce, night.reading);
  parts.bounce.color.setHex(NIGHT_LIGHT.readingColour);
  parts.fill.intensity = FILL.intensity * night.floor;
}

export interface Shading {
  readonly tiles: readonly PlacedTile[];
  /** Hears the near ground's Sun mask, per node of its grid. */
  readonly onLit: (lit: Float32Array) => void;
  readonly profile: HorizonProfile | null;
  readonly mask: SunMask;
}

/** Shades every tile from `sky`'s Sun and sets the mask's factors. */
export function shadeSun(shading: Shading, sky: SkyDirs): void {
  const sun = { azDeg: sky.sunAz, elDeg: sky.sunEl };
  let centre = 1;
  for (const placed of shading.tiles) {
    const lit = sunLit(placed.tile, placed.ys, sun);
    if (placed === shading.tiles[0]) shading.onLit(lit);
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
