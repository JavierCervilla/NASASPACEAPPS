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
 * What the ground costs per tier (VENT-69). VENT-62 gave the ground lunar
 * photometry, a second normal read, a footprint by `fwidth`, the fine real
 * relief and 520 rocks; on a Pixel 10 (PowerVR, medium) the first frame took
 * 1.6 s and the GPU reset. Medium and low go back to what the ground cost
 * before VENT-62, and the four parts that grew it come only at high; the
 * rocks keep 420 at medium and none at low. The exposure gain (+20 %) costs
 * nothing and stays everywhere. `?onfoot=` words leave a part out at any
 * tier, to bisect a phone from its address bar. Pure.
 */
import type { Tier } from '../lib/quality';
import type { LeaveOut } from './leave-out';
import { MEASURED } from './rock-law';

/** The rocks a medium tier draws: the first cut's count, before VENT-62. */
export const MEDIUM_ROCKS = 420;

export interface GroundPolicy {
  /** The lunar Sun (`RE_Direct_Ground`) instead of three's Lambert. */
  readonly photometry: boolean;
  /** The second, turned read of the normal map. */
  readonly antitile: boolean;
  /** The grain fading by the pixel footprint (`fwidth`), not by distance. */
  readonly footprint: boolean;
  /** The fine real relief: its tile is fetched and its shader block built. */
  readonly fine: boolean;
  /** The most rocks drawn; 0: no rock mesh at all. */
  readonly rocksCap: number;
}

const ROCKS: Readonly<Record<Tier, number>> = {
  high: MEASURED.cap,
  medium: MEDIUM_ROCKS,
  low: 0,
};

/** The ground's costs at `tier`, less the parts `leave` names. */
export function groundPolicy(
  tier: Tier,
  leave: ReadonlySet<LeaveOut>,
): GroundPolicy {
  const high = tier === 'high';
  return {
    photometry: high && !leave.has('photometry'),
    antitile: high && !leave.has('antitile'),
    footprint: high && !leave.has('footprint'),
    fine: high && !leave.has('fine'),
    rocksCap: leave.has('rocks') ? 0 : ROCKS[tier],
  };
}

/** The ground at its fullest: what the tests of one part patch with. */
export const FULL_GROUND: GroundPolicy = groundPolicy('high', new Set());

/**
 * The material's program cache key: two policies that make different
 * shader text never share a program.
 */
export function groundKey(policy: GroundPolicy): string {
  const on = (flag: boolean, letter: string): string => (flag ? letter : '-');
  return `sun-tile-regolith-${on(policy.photometry, 'p')}${
    on(policy.antitile, 'a')}${on(policy.footprint, 'f')}${
    on(policy.fine, 'r')}`;
}
