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
 * When a new instant is worth lighting the on-foot view again (VENT-49):
 * only when the Sun or the Earth, seen from the point, moved at least
 * {@link RELIGHT_DEG} since the sky the view last placed. The live clock
 * makes a new instant every minute for a Sun that moves 0.008 degrees in
 * it; each one re-shaded every ring and drew frames, work a phone's GPU can
 * do without. A scrub of hours moves the Sun far more than the threshold,
 * so it lights at once, and nothing here needs to know where an instant
 * came from. Pure.
 */
import type { SkyDirs } from './scene/scene-types';
import { direction } from './view-camera';

/** The least move of the Sun or the Earth that lights the view again. */
export const RELIGHT_DEG = 0.1;

/** Rounding that must not turn a move of exactly the threshold into none. */
const ROUNDING_DEG = 1e-9;

const DEG = 180 / Math.PI;

/** The angle between two directions on the sky, degrees. */
function between(a: readonly number[], b: readonly number[]): number {
  const [ax = 0, ay = 0, az = 0] = a;
  const [bx = 0, by = 0, bz = 0] = b;
  const cross = Math.hypot(ay * bz - az * by, az * bx - ax * bz,
    ax * by - ay * bx);
  return Math.atan2(cross, ax * bx + ay * by + az * bz) * DEG;
}

/** How far the Sun and the Earth moved between two skies, degrees. */
export function skyMove(
  last: SkyDirs,
  next: SkyDirs,
): { readonly sunDeg: number; readonly earthDeg: number } {
  return {
    sunDeg: between(direction(last.sunAz, last.sunEl),
      direction(next.sunAz, next.sunEl)),
    earthDeg: between(direction(last.earthAz, last.earthEl),
      direction(next.earthAz, next.earthEl)),
  };
}

/** Whether `next` is worth lighting over `last` (null: nothing yet). */
export function needsRelight(
  last: SkyDirs | null,
  next: SkyDirs,
  thresholdDeg: number = RELIGHT_DEG,
): boolean {
  if (!last) return true;
  const { sunDeg, earthDeg } = skyMove(last, next);
  return Math.max(sunDeg, earthDeg) >= thresholdDeg - ROUNDING_DEG;
}

/** What the view does with an instant, and the step the report notes. */
export interface Relight {
  readonly relight: boolean;
  readonly text: string;
  /** The report folds consecutive steps with one key into one. */
  readonly repeat: 'relight' | 'skip';
}

/**
 * Whether to light `next` over `last`. A `forced` change (a new ground, a
 * new ring) lights whatever the sky did, because the new meshes have no
 * light yet.
 */
export function decideRelight(
  last: SkyDirs | null,
  next: SkyDirs,
  forced: boolean,
): Relight {
  if (!last) return { relight: true, text: 'relight: first sky', repeat: 'relight' };
  if (forced) return { relight: true, text: 'relight: new ground', repeat: 'relight' };
  const { sunDeg, earthDeg } = skyMove(last, next);
  const moved = `Sun moved ${sunDeg.toFixed(3)} deg, ` +
    `Earth ${earthDeg.toFixed(3)} deg`;
  return needsRelight(last, next)
    ? { relight: true, text: `relight: ${moved}`, repeat: 'relight' }
    : { relight: false, repeat: 'skip',
      text: `instant skipped: ${moved} since the last relight` };
}
