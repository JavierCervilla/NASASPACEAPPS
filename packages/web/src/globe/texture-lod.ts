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
 * Which Moon map the globe needs: a level of detail chosen from the zoom,
 * capped by the device. A level is the colour map's width in thousands of
 * pixels; the relief (LOLA normal map) follows it up to 4K, the most the
 * 16 px/degree LOLA source holds. Pure, so every rule is tested alone.
 */
import type { Tier } from '../lib/quality';

export type LodLevel = 1 | 2 | 4 | 8;

/**
 * Camera distances, in Moon radii, from which the next map is fetched.
 * At the opening view (5 radii) the 2K map is about one texel per pixel on
 * a 900 px tall viewport; at 3.5 radii it is magnified 1.6 times and the
 * 4K map takes over, and at 2.2 radii the 4K map is magnified as much and
 * the 8K map takes over.
 */
export const LOD_DISTANCE = { level4: 3.5, level8: 2.2 } as const;

/**
 * The most each tier may load: 4K on the low and medium tiers (phones
 * never run the high tier), so a close look is sharp on every device whose
 * GPU takes 4K; 8K on the high tier only.
 */
const TIER_MAX: Readonly<Record<Tier, LodLevel>> = {
  low: 4,
  medium: 4,
  high: 8,
};

export interface LodCaps {
  readonly tier: Tier;
  /** The browser asks to save data: nothing beyond the start map. */
  readonly saveData: boolean;
  /** The GPU's largest texture side, in pixels. */
  readonly maxTextureSize: number;
}

/** The map the globe opens with: 2K on the high tier, else 1K. */
export function startLevel(tier: Tier): LodLevel {
  return tier === 'high' ? 2 : 1;
}

/** The largest map this device may ever load. */
export function maxLevel(caps: LodCaps): LodLevel {
  const start = startLevel(caps.tier);
  if (caps.saveData) return start;
  const fits = ([8, 4, 2, 1] as const).find(
    (level) => level * 1024 <= caps.maxTextureSize,
  );
  return Math.max(start, Math.min(TIER_MAX[caps.tier], fits ?? 1)) as LodLevel;
}

/** The level the zoom alone asks for (1: the start map is enough). */
function zoomLevel(distance: number): LodLevel {
  if (distance <= LOD_DISTANCE.level8) return 8;
  return distance <= LOD_DISTANCE.level4 ? 4 : 1;
}

/** The map the camera at `distance` (Moon radii) needs, within the caps. */
export function wantedLevel(distance: number, caps: LodCaps): LodLevel {
  const start = startLevel(caps.tier);
  const zoomed = Math.max(zoomLevel(distance), start);
  return Math.min(zoomed, maxLevel(caps)) as LodLevel;
}

/** The colour and relief maps of a level, under the site's base path. */
export function levelUrls(
  level: LodLevel,
  base: string,
): { colour: string; normal: string } {
  const root = `${base.replace(/\/?$/, '/')}textures/`;
  const relief = Math.min(level, 4);
  return {
    colour: `${root}moon-lroc-${level}k.jpg`,
    normal: `${root}moon-lola-normal-${relief}k.jpg`,
  };
}
