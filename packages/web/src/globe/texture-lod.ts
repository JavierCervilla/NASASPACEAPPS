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
 * Which Moon map the globe needs: the smallest level of detail sharp enough
 * for the Moon's disc on screen, capped by the device. A level is the colour
 * map's width in thousands of pixels; the relief (LOLA normal map) follows
 * it up to 4K, the most the 16 px/degree LOLA source holds. Pure, so every
 * rule is tested alone.
 */
import type { Tier } from '../lib/quality';
import type { Ktx2Target } from './ktx2-target';
import { pxPerTexel, type LodView } from './disc-density';

export type { LodView } from './disc-density';

export type LodLevel = 1 | 2 | 4 | 8;

const LEVELS: readonly LodLevel[] = [1, 2, 4, 8];

/**
 * The most drawing-buffer pixels one texel may cover at the disc's centre,
 * where the map is stretched the most (pi/2 times the average across the
 * disc). Over about 1.2 bilinear magnification reads as soft; 1.15 keeps a
 * margin, so a Pixel-sized phone (590 CSS px frame at ratio 1.75) wants 2K
 * at the opening view (1.03) and 4K from about 4.5 radii, and the 547 px
 * globe of a 1440 x 900 desktop window keeps 1K at the opening view at
 * ratio 1 (1.09) and wants 2K at ratio 2.
 */
export const MAX_PX_PER_TEXEL = 1.15;

/**
 * The most each tier may load: 4K on the low tier and on a phone, so a
 * close look is sharp on every device whose GPU takes 4K; 8K on the high
 * tier, and on a desktop at the medium tier too (VENT-122: Brave reports a
 * random core count, so a capable desktop may read as medium).
 */
function tierMax(tier: Tier, phone: boolean): LodLevel {
  if (tier === 'low') return 4;
  return tier === 'medium' && phone ? 4 : 8;
}

export interface LodCaps {
  readonly tier: Tier;
  /** The phone layout: its cap stays 4K at any tier. */
  readonly phone: boolean;
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
  const cap = tierMax(caps.tier, caps.phone);
  return Math.max(start, Math.min(cap, fits ?? 1)) as LodLevel;
}

/**
 * The map `view` needs, within the caps. Levels only climb (texture-swap.ts
 * ignores a lower one), so a zoom across a threshold never flips maps.
 */
export function wantedLevel(view: LodView, caps: LodCaps): LodLevel {
  const sharp = LEVELS.find((l) => pxPerTexel(l, view) <= MAX_PX_PER_TEXEL);
  const wanted = Math.max(sharp ?? 8, startLevel(caps.tier));
  return Math.min(wanted, maxLevel(caps)) as LodLevel;
}

/**
 * The levels whose colour also ships as KTX2 (VENT-101): the 1K stays JPEG
 * (the start, offline and the fallback), and the 8K is past the wasm
 * encoder's reach.
 */
const KTX2_LEVELS: ReadonlySet<LodLevel> = new Set([2, 4]);

/**
 * The colour and relief maps of a level, under the site's base path; the
 * colour as KTX2 when `target` names the GPU's format and the level has one.
 */
export function levelUrls(
  level: LodLevel,
  base: string,
  target: Ktx2Target | null = null,
): { colour: string; normal: string } {
  const root = `${base.replace(/\/?$/, '/')}textures/`;
  const relief = Math.min(level, 4);
  const ktx2 = target !== null && KTX2_LEVELS.has(level);
  return {
    colour: `${root}moon-lroc-${level}k.${ktx2 ? 'ktx2' : 'jpg'}`,
    normal: `${root}moon-lola-normal-${relief}k.jpg`,
  };
}
