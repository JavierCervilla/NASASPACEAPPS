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
 * How the on-foot view is turned (VENT-34): a drag with Pointer Events
 * and capture (mouse, pen or one finger; a swipe across the view turns it
 * 180°), a release that carries the finger's speed on (look-coast.ts), a
 * press that stops the coast, the arrows on the focused view
 * (look-input.ts), a tap on the ground, which walks (VENT-121, walk.ts; the
 * arrows walked until VENT-122), and Home, which turns it back to where it
 * opened as the compass does (VENT-63). A key the view does not use is left
 * to the page.
 */
import { VelocityTracker } from '../../globe/velocity';
import { keyLook, type DragScale } from '../look-input';
import {
  hoverAt,
  press,
  pressOf,
  release,
  turn,
  type Press,
} from './drag-steps';
import type { Walker } from './walk';
import type { Look } from '../view-camera';

export interface LookTarget {
  readonly look: () => Look;
  /** Turns back to where the view opened (look-home.ts). */
  readonly goHome: () => void;
  readonly set: (look: Look) => void;
  /** Degrees per px of drag, by axis. */
  readonly scale: () => DragScale;
  /** A release at this speed, px per second, may coast. */
  readonly fling: (vx: number, vy: number) => void;
  /** A press: any coast stops where it is. */
  readonly halt: () => void;
  /** The pointer went down (true) or up or was cancelled (false). */
  readonly drag: (down: boolean) => void;
  /** Taps and a fine pointer's hover (VENT-121). */
  readonly walker: Pick<Walker, 'tap' | 'hover'>;
}

type Handlers = readonly (readonly [string, EventListener])[];

const listener = (fn: (e: PointerEvent) => void) => fn as EventListener;

/**
 * The drag's handlers on `el`, one pointer at a time. A drag turns the view
 * as it always did; a press that never travels the globe's slop
 * (lib/press-slop.ts) is a tap, which walks (VENT-121); a fine pointer with
 * no button down hovers.
 */
function dragHandlers(el: HTMLElement, target: LookTarget): Handlers {
  let last: Press | null = null;
  let tracker = new VelocityTracker();
  const down = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    last = pressOf(e);
    tracker = press(target, e);
  };
  const move = (e: PointerEvent): void => {
    if (!last) return void hoverAt(target, e);
    if (e.pointerId !== last.id) return;
    tracker.add(e.clientX, e.clientY, e.timeStamp);
    last = turn(target, last, e);
  };
  const up = (e: PointerEvent): void => {
    if (last?.id !== e.pointerId) return;
    release(target, tracker, e, !last.travelled);
    last = null;
  };
  return [['pointerdown', listener(down)], ['pointermove', listener(move)],
    ['pointerup', listener(up)], ['pointercancel', listener(up)],
    ['pointerleave', () => target.walker.hover(null)]];
}

/** Binds drag and keys on `el`; returns the unbind. */
export function bindLook(el: HTMLElement, target: LookTarget): () => void {
  const key = (e: KeyboardEvent): void => {
    const next = keyLook(target.look(), e);
    if (!next && e.key !== 'Home') return;
    e.preventDefault();
    if (next) target.set(next);
    else target.goHome();
  };
  const pairs: Handlers = [...dragHandlers(el, target),
    ['keydown', key as EventListener]];
  for (const [type, fn] of pairs) el.addEventListener(type, fn);
  return () => {
    for (const [type, fn] of pairs) el.removeEventListener(type, fn);
  };
}
