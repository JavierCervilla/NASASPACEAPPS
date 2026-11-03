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
 * The coast of a swipe on the on-foot view (VENT-34, apple-design): on
 * release the finger's velocity goes on into the yaw and pitch and decays
 * as a flick on the globe does (globe/spring.ts `projectMomentum`: speed
 * times `RATE` per millisecond, which carries a fifth of a second of the
 * release speed), stops under {@link STOP_DEG_S}, and is never started
 * under reduced motion or by a slow drag. The caller owns the clock, and
 * draws frames only while a coast lasts. Pure.
 */
import { turnLook, type Look } from './view-camera';
import type { DragScale } from './look-input';

/** Speed kept per millisecond, as the globe's flick (0.995). */
export const RATE = 0.995;
/** Release speeds under this, px per second, are a placement. */
export const FLING_MIN_PX_S = 120;
/** A coast under this speed, degrees per second, is over. */
export const STOP_DEG_S = 2;
const MS_PER_S = 1000;
/** Decay rate per second: `RATE ** 1000 = exp(-DECAY)`. */
const DECAY = -Math.log(RATE) * MS_PER_S;

/** Angular velocity, degrees per second. */
export interface Coast {
  readonly yaw: number;
  readonly pitch: number;
}

/**
 * The coast of a release at `vx`, `vy` px per second, or null: reduced
 * motion, or a release too slow to be a flick.
 */
export function coastOf(
  v: { readonly x: number; readonly y: number },
  scale: DragScale,
  reducedMotion: boolean,
): Coast | null {
  if (reducedMotion || Math.hypot(v.x, v.y) < FLING_MIN_PX_S) return null;
  return { yaw: -v.x * scale.yaw, pitch: v.y * scale.pitch };
}

/** How far a coast at `speed` degrees per second goes in all. */
export const travelDeg = (speed: number): number => speed / DECAY;

/**
 * `look` after `dtS` seconds of the coast, and what is left of it (null
 * once it stopped). Exact for any frame time: the speed decays
 * exponentially and the distance is its integral.
 */
export function stepCoast(
  look: Look,
  coast: Coast,
  dtS: number,
): { look: Look; coast: Coast | null } {
  const kept = Math.exp(-DECAY * dtS);
  const carried = (1 - kept) / DECAY;
  const next = turnLook(look, coast.yaw * carried, coast.pitch * carried);
  const pitchHeld = next.pitchDeg === look.pitchDeg + coast.pitch * carried;
  const left = { yaw: coast.yaw * kept,
    pitch: pitchHeld ? coast.pitch * kept : 0 };
  const stopped = Math.hypot(left.yaw, left.pitch) < STOP_DEG_S;
  return { look: next, coast: stopped ? null : left };
}
