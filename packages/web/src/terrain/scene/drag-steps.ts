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
 * The steps of a drag on the on-foot view (VENT-34), apart from the
 * pointer bookkeeping in controls.ts: the velocity tracker a press starts,
 * what a release does with it, and one turn of the look.
 */
import { VelocityTracker } from '../../globe/velocity';
import { pastSlop } from '../../lib/press-slop';
import { dragLook } from '../look-input';
import type { LookTarget } from './controls';

/**
 * Where a press started, whether it travelled past the slop, and whether
 * it stopped a coast (VENT-128).
 */
export interface Press {
  readonly x: number;
  readonly y: number;
  readonly id: number;
  readonly start: { readonly x: number; readonly y: number };
  readonly travelled: boolean;
  readonly halted: boolean;
}

/** A press of `e`, where it starts, not travelled yet. */
export function pressOf(e: PointerEvent, halted: boolean): Press {
  const start = { x: e.clientX, y: e.clientY };
  return { ...start, id: e.pointerId, start, travelled: false, halted };
}

/**
 * A press stops any coast, marks the drag and starts the tracker; `halted`
 * when it stopped a coast.
 */
export function press(target: LookTarget, e: PointerEvent) {
  const halted = target.halt();
  target.drag(true);
  const tracker = new VelocityTracker();
  tracker.add(e.clientX, e.clientY, e.timeStamp);
  return { tracker, halted };
}

/**
 * A release carries the finger's speed on; a cancel carries nothing; the
 * release of a press that never travelled the slop is a tap, which walks
 * there instead (VENT-121), unless the press stopped a coast: then, as on
 * the globe, it only stopped the view where it was (VENT-128).
 */
export function release(
  target: LookTarget,
  tracker: VelocityTracker,
  e: PointerEvent,
  last: Press,
): void {
  target.drag(false);
  if (!last.travelled && e.type === 'pointerup') {
    if (last.halted) return;
    target.walker.tap(e.clientX, e.clientY, e.pointerType === 'touch');
    return;
  }
  const v = tracker.velocity(e.timeStamp);
  if (e.type === 'pointerup') target.fling(v.x, v.y);
}

/** A fine pointer moving with no button down: the marker follows it. */
export function hoverAt(target: LookTarget, e: PointerEvent): void {
  if (e.pointerType === 'touch') return;
  target.walker.hover({ x: e.clientX, y: e.clientY });
}

/** Turns the look by the pointer's move; the press, moved on. */
export function turn(target: LookTarget, last: Press, e: PointerEvent): Press {
  const { look, scale } = target;
  const delta = [e.clientX - last.x, e.clientY - last.y] as const;
  target.set(dragLook(look(), delta, scale()));
  return { ...last, x: e.clientX, y: e.clientY,
    travelled: last.travelled ||
      pastSlop(last.start, { x: e.clientX, y: e.clientY }) };
}
