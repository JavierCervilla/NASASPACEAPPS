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
 * The sheet's live state: one spring on its top edge, the finger that drags
 * it and the detent it rests on or heads for. Pure: the caller owns the
 * clock and the DOM, so every rule here is tested alone.
 */
import type { SpringAxis } from '../globe/spring';
import { stepDampedSpring } from './damped-spring';
import {
  rubberBand,
  unRubberBand,
  type DetentName,
  type Detents,
} from './sheet-physics';

export interface SheetState {
  /** The top edge, in px: value shown, velocity, and where it goes. */
  readonly axis: SpringAxis;
  detents: Detents;
  /** The detent the sheet rests on, or is settling toward. */
  detent: DetentName;
  /** Where the finger would put the edge, before the rubber band. */
  finger: number;
  /** 1 by default; 0.8 after a flick (apple-design: bounce only then). */
  damping: number;
}

/** Sheet response (apple-design: drawer or sheet, 0.3 s). */
const RESPONSE_S = 0.3;
/** Release speeds from this, in px/s, are a flick and earn a bounce. */
export const FLICK_MIN_PX_S = 300;
const FLICK_DAMPING = 0.8;

/** A sheet at rest on `detent`. */
export function createSheetState(
  detents: Detents,
  detent: DetentName,
): SheetState {
  const y = detents[detent];
  const axis = { value: y, velocity: 0, target: y };
  return { axis, detents, detent, finger: y, damping: 1 };
}

/**
 * A finger lands: the sheet stops where it is now, mid-animation or not,
 * and the drag starts from there (apple-design §3).
 */
export function grabSheet(state: SheetState, dimension: number): void {
  const { axis } = state;
  Object.assign(axis, { target: axis.value, velocity: 0 });
  const bounds = { min: state.detents.full, max: state.detents.closed };
  state.finger = unRubberBand(axis.value, bounds, dimension);
}

/** The finger moved `dy` px: the edge follows 1:1, banded at the ends. */
export function dragSheet(
  state: SheetState,
  dy: number,
  dimension: number,
): void {
  state.finger += dy;
  const bounds = { min: state.detents.full, max: state.detents.closed };
  const y = rubberBand(state.finger, bounds, dimension);
  Object.assign(state.axis, { value: y, target: y, velocity: 0 });
}

/**
 * Heads for `detent` carrying the release velocity `vy` (px/s), with a
 * bounce only when it was a flick; under reduced motion it lands at once.
 */
export function settleSheet(
  state: SheetState,
  detent: DetentName,
  vy: number,
  reducedMotion: boolean,
): void {
  const y = state.detents[detent];
  state.detent = detent;
  state.finger = y;
  const flick = Math.abs(vy) >= FLICK_MIN_PX_S;
  state.damping = flick && !reducedMotion ? FLICK_DAMPING : 1;
  const velocity = reducedMotion ? 0 : vy;
  const value = reducedMotion ? y : state.axis.value;
  Object.assign(state.axis, { value, velocity, target: y });
}

/** Advances the spring `dt` seconds; true while the sheet still moves. */
export function stepSheet(state: SheetState, dt: number): boolean {
  return stepDampedSpring(state.axis, dt, {
    response: RESPONSE_S,
    damping: state.damping,
  });
}
