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
 * press that stops the coast, and the arrows and Home on the focused view
 * (look-input.ts). A key the view does not use is left to the page.
 */
import { VelocityTracker } from '../../globe/velocity';
import { keyLook, type DragScale } from '../look-input';
import { release, startTracker, turn } from './drag-steps';
import type { Look } from '../view-camera';

export interface LookTarget {
  readonly look: () => Look;
  readonly home: () => Look;
  readonly set: (look: Look) => void;
  /** Degrees per px of drag, by axis. */
  readonly scale: () => DragScale;
  /** A release at this speed, px per second, may coast. */
  readonly fling: (vx: number, vy: number) => void;
  /** A press: any coast stops where it is. */
  readonly halt: () => void;
}

type Handlers = readonly (readonly [string, EventListener])[];

const listener = (fn: (e: PointerEvent) => void) => fn as EventListener;

/** The drag's handlers on `el`, one pointer at a time. */
function dragHandlers(el: HTMLElement, target: LookTarget): Handlers {
  let last: { x: number; y: number; id: number } | null = null;
  let tracker = new VelocityTracker();
  const down = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    target.halt();
    el.setPointerCapture(e.pointerId);
    last = { x: e.clientX, y: e.clientY, id: e.pointerId };
    tracker = startTracker(e);
  };
  const move = (e: PointerEvent): void => {
    if (!last || e.pointerId !== last.id) return;
    const delta = [e.clientX - last.x, e.clientY - last.y] as const;
    last = { ...last, x: e.clientX, y: e.clientY };
    tracker.add(e.clientX, e.clientY, e.timeStamp);
    turn(target, delta);
  };
  const up = (e: PointerEvent): void => {
    if (last?.id !== e.pointerId) return;
    last = null;
    release(target, tracker, e);
  };
  return [['pointerdown', listener(down)], ['pointermove', listener(move)],
    ['pointerup', listener(up)], ['pointercancel', listener(up)]];
}

/** Binds drag and keys on `el`; returns the unbind. */
export function bindLook(el: HTMLElement, target: LookTarget): () => void {
  const key = (e: KeyboardEvent): void => {
    const next = keyLook(target.look(), e, target.home());
    if (!next) return;
    e.preventDefault();
    target.set(next);
  };
  const pairs: Handlers = [...dragHandlers(el, target),
    ['keydown', key as EventListener]];
  for (const [type, fn] of pairs) el.addEventListener(type, fn);
  return () => {
    for (const [type, fn] of pairs) el.removeEventListener(type, fn);
  };
}
