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
 * The view's lunar night (VENT-100, the human's «intermediate» night on
 * the canvas): when the Sun is under the point's horizon, the terrain's
 * where there is a profile, else the level, the view keeps a quarter of
 * the day's lifted floor, takes the Earth's light as a real directional
 * light by its lit share and how far it is over the same horizon (none
 * while the terrain hides it), and adds a low, fixed light that rakes the
 * relief so it reads (the caption says it is added). The exposure stays
 * the dark one of `stage.ts`. Pure numbers, relative to the Sun's key
 * light; by day nothing here applies.
 */
import {
  hasSun,
  horizonAt,
  isAboveTerrain,
  type HorizonProfile,
} from '@ventana/sim';
import type { SkyDirs } from './scene/scene-types';
import { earthPhase } from './sky-light';
import { direction, type Vec3 } from './view-camera';

/** The night's constants, all in one place. */
export const NIGHT_LIGHT = {
  /** The share of the day's hemisphere floor that stays. */
  floor: 0.25,
  /** A full Earth's light high enough, relative to the key. */
  earthMax: 0.5,
  /** The reading light: from this azimuth and elevation, degrees. */
  readingAzDeg: 300,
  readingElDeg: 10,
  /** The reading light, relative to the key. */
  reading: 0.15,
  /** A cool white, not the Sun's warm one. */
  readingColour: 0xdfe3ec,
} as const;

/**
 * The Earth's light grows from this height over the horizon, degrees,
 * over `EARTH_RISE_DEG` (its disc is 1.9° across).
 */
const EARTH_FROM_DEG = -0.5;
const EARTH_RISE_DEG = 2;
/** The Earth's light comes from at least this far up, degrees. */
const EARTH_LOWEST_DEG = 0.5;

export interface NightLight {
  /** The share of the day's hemisphere floor. */
  readonly floor: number;
  readonly earthshine: { readonly toward: Vec3; readonly intensity: number };
  readonly reading: { readonly toward: Vec3; readonly intensity: number };
}

/**
 * Whether the Sun is under the point's horizon at `sky`: the answer the
 * «Sunrise in» widget reads from its hours (`hasSun`).
 */
export function isNight(sky: SkyDirs, profile: HorizonProfile | null): boolean {
  return !hasSun(profile
    ? { sunEl: sky.sunEl,
      sunAboveTerrain: isAboveTerrain(profile, sky.sunAz, sky.sunEl) }
    : { sunEl: sky.sunEl });
}

/** The night's lights at `sky`, over `profile`'s horizon or the level. */
export function nightLight(
  sky: SkyDirs,
  profile: HorizonProfile | null,
): NightLight {
  const horizon = profile ? horizonAt(profile, sky.earthAz) : 0;
  const rise = Math.min(Math.max(
    (sky.earthEl - horizon - EARTH_FROM_DEG) / EARTH_RISE_DEG, 0), 1);
  return {
    floor: NIGHT_LIGHT.floor,
    earthshine: {
      toward: direction(sky.earthAz, Math.max(sky.earthEl, EARTH_LOWEST_DEG)),
      intensity: NIGHT_LIGHT.earthMax * earthPhase(sky) * rise,
    },
    reading: {
      toward: direction(NIGHT_LIGHT.readingAzDeg, NIGHT_LIGHT.readingElDeg),
      intensity: NIGHT_LIGHT.reading,
    },
  };
}
