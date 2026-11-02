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
 * The fill light of the view (VENT-34), what lights what the Sun does not
 * reach, from the sky and never a flat lift. Three sources: the Earth's
 * light on the shadowed ground (the lit share of its disc, only while it
 * is above the level), the ground's bounce back into the shadows (the
 * sunlit regolith round the point, so it follows the Sun's height), and a
 * dim floor that keeps the view legible when neither is there (the caption
 * says the shadows are lifted). Pure numbers, relative to the key light.
 */
import type { SkyDirs } from './scene/scene-types';
import { direction, type Vec3 } from './view-camera';

/** The most the Earth's light gives, a full Earth high in the sky. */
const EARTHSHINE_MAX = 0.16;
/** The ground's bounce under a Sun standing straight up. */
const BOUNCE_MAX = 0.5;
/** Where the bounce comes from: opposite the Sun, this far up, degrees. */
const BOUNCE_ELEVATION_DEG = 20;
/** The Earth's light fades in over these degrees above the level. */
const EARTH_RISE_DEG = 6;

export interface FillLight {
  /** Toward the Earth, and its intensity. */
  readonly earthshine: { readonly toward: Vec3; readonly intensity: number };
  /** Toward the bounce, and its intensity. */
  readonly bounce: { readonly toward: Vec3; readonly intensity: number };
}

const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1);

/** The Earth's lit share seen from the Moon: 1 full, 0 new. */
export function earthPhase(sky: SkyDirs): number {
  const sun = direction(sky.sunAz, sky.sunEl);
  const earth = direction(sky.earthAz, sky.earthEl);
  const along = -(sun[0] * earth[0] + sun[1] * earth[1] + sun[2] * earth[2]);
  return (1 + along) / 2;
}

/** The fill at `sky`. */
export function fillLight(sky: SkyDirs): FillLight {
  const rise = clamp01((sky.earthEl + 1) / EARTH_RISE_DEG);
  const sun = clamp01(Math.sin((Math.max(sky.sunEl, 0) * Math.PI) / 180));
  return {
    earthshine: { toward: direction(sky.earthAz, Math.max(sky.earthEl, 0.5)),
      intensity: EARTHSHINE_MAX * earthPhase(sky) * rise },
    bounce: { toward: direction(sky.sunAz + 180, BOUNCE_ELEVATION_DEG),
      intensity: BOUNCE_MAX * sun },
  };
}
