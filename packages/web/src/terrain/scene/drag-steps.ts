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
import { dragLook } from '../look-input';
import type { LookTarget } from './controls';

/** A press stops any coast, marks the drag and starts the tracker. */
export function press(target: LookTarget, e: PointerEvent): VelocityTracker {
  target.halt();
  target.drag(true);
  const tracker = new VelocityTracker();
  tracker.add(e.clientX, e.clientY, e.timeStamp);
  return tracker;
}

/** A release carries the finger's speed on; a cancel carries nothing. */
export function release(
  target: LookTarget,
  tracker: VelocityTracker,
  e: PointerEvent,
): void {
  target.drag(false);
  const v = tracker.velocity(e.timeStamp);
  if (e.type === 'pointerup') target.fling(v.x, v.y);
}

export function turn(
  target: LookTarget,
  delta: readonly [number, number],
): void {
  const { look, scale } = target;
  target.set(dragLook(look(), delta, scale()));
}
