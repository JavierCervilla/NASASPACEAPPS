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
 * Drag to rotate, with Pointer Events. A press only becomes a drag past a
 * few pixels (apple-design's hysteresis), so a click on a site marker stays a
 * click; from then on the pointer is captured and the globe follows it 1:1.
 * A second finger ends the drag: two fingers pinch. A move already
 * handled (a finger holding the pin, pin/place-gesture.ts) is not a drag.
 * A press on a globe still turning from a flick stops it where it is, like
 * Maps, and marks its `pointerdown` handled: that press drops no pin.
 * A mouse that leaves the globe lets it go where it is, with no coast
 * (VENT-122): a move outside the view, a move with no button down (its
 * `pointerup` was lost: a release outside the window, a context menu) or a
 * lost capture. Capture keeps the moves coming outside the view, so the box
 * is read, not `pointerleave`. A finger or a pen keeps its drag.
 */
import { pastSlop } from '../lib/press-slop';
import { mouseLetGo } from './drag-exit';
import { VelocityTracker } from './velocity';

type PointerType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'lostpointercapture';

/** What the globe does with a drag; deltas and velocities are in px. */
export interface DragTarget {
  drag(dxPx: number, dyPx: number): void;
  release(vxPx: number, vyPx: number): void;
  /** A press landed: stop any flick; true when one was stopped. */
  press?(): boolean;
}

class DragGesture {
  private start: { x: number; y: number; id: number } | null = null;
  private last = { x: 0, y: 0 };
  private dragging = false;
  private tracker = new VelocityTracker();

  constructor(
    private readonly el: HTMLElement,
    private readonly target: DragTarget,
  ) {}

  down(event: PointerEvent): void {
    if (event.button !== 0) return;
    if (this.target.press?.()) event.preventDefault();
    if (this.start) {
      // A second finger: a pinch (pinch.ts), so the drag lets go.
      this.start = null;
      return;
    }
    this.start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    this.last = { x: event.clientX, y: event.clientY };
    this.dragging = false;
    this.tracker = new VelocityTracker();
    this.tracker.add(event.clientX, event.clientY, event.timeStamp);
  }

  move(event: PointerEvent): void {
    const { start } = this;
    if (!start || event.pointerId !== start.id || event.defaultPrevented) {
      return;
    }
    if (mouseLetGo(this.el, event)) return this.up(event, false);
    const at = { x: event.clientX, y: event.clientY };
    if (!this.dragging && !pastSlop(start, at)) return;
    if (!this.dragging) {
      this.dragging = true;
      this.el.setPointerCapture(event.pointerId);
    }
    this.target.drag(event.clientX - this.last.x, event.clientY - this.last.y);
    this.last = { x: event.clientX, y: event.clientY };
    this.tracker.add(event.clientX, event.clientY, event.timeStamp);
  }

  /** The press ends; `coast` false lets go at no speed, so no flick. */
  up(event: PointerEvent, coast = true): void {
    if (!this.start || event.pointerId !== this.start.id) return;
    if (this.dragging) {
      const v = coast
        ? this.tracker.velocity(event.timeStamp)
        : { x: 0, y: 0 };
      this.target.release(v.x, v.y);
    }
    this.start = null;
    this.dragging = false;
  }
}

/** Listens for drags on `el`; returns the unbind function. */
export function bindDrag(el: HTMLElement, target: DragTarget): () => void {
  const gesture = new DragGesture(el, target);
  const listeners: [PointerType, (event: PointerEvent) => void][] = [
    ['pointerdown', (e) => gesture.down(e)],
    ['pointermove', (e) => gesture.move(e)],
    ['pointerup', (e) => gesture.up(e)],
    ['pointercancel', (e) => gesture.up(e)],
    ['lostpointercapture', (e) => {
      if (e.pointerType === 'mouse') gesture.up(e, false);
    }],
  ];
  for (const [type, fn] of listeners) el.addEventListener(type, fn);
  return () => {
    for (const [type, fn] of listeners) {
      el.removeEventListener(type, fn);
    }
  };
}
