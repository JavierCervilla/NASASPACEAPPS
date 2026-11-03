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
 * Where the on-foot loader is (VENT-60, B→A): asking for the tile list,
 * the near tiles (levels 0 and 1, 2 and 8 km) landing on the plan, the
 * ground being shaped once they are in, and the hand-over when the scene
 * has drawn its first frame. The far tiles (levels 2 and 3) are counted
 * apart, for the chip that follows the hand-over. Pure.
 */
import { tally, type RingProgress } from '../ring/ring-progress';

export type LoaderPhase = 'list' | 'near' | 'shaping' | 'handover';

/** The levels the view stands on: 2 and 8 km. */
export const NEAR_LEVELS = 2;
const ALL_LEVELS = 4;

/** Whether every near tile came or failed for good. */
export function nearIn(p: RingProgress): boolean {
  const near = tally(p, 0, NEAR_LEVELS);
  return p.scheme !== null && near.done === near.total;
}

export interface PhaseFacts {
  readonly progress: RingProgress;
  /** The near ground stands (the ring is ready). */
  readonly ready: boolean;
  /** The scene has drawn its first frame. */
  readonly drawn: boolean;
}

/** The loader's phase for `facts`. */
export function loaderPhase(facts: PhaseFacts): LoaderPhase {
  if (facts.drawn) return 'handover';
  if (facts.ready || nearIn(facts.progress)) return 'shaping';
  return facts.progress.scheme === null ? 'list' : 'near';
}

/** The far tiles' count; null when the view asks for none. */
export function farTally(
  p: RingProgress,
): { done: number; total: number } | null {
  const far = tally(p, NEAR_LEVELS, ALL_LEVELS);
  return far.total === 0 ? null : far;
}
