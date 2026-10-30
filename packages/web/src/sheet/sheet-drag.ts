/**
 * Vertical drags on the sheet, with Pointer Events. A press becomes a drag
 * past a few pixels, so taps on the buttons inside stay taps (and a tap
 * while the sheet moves lets it arrive). The drag catches the sheet where
 * it is, mid-flight or not; from then on the pointer is captured and the
 * sheet follows it 1:1.
 */
import { VelocityTracker } from '../globe/velocity';

/** What the sheet does with a drag; distances in px, velocity in px/s. */
export interface SheetDragTarget {
  grab(): void;
  drag(dy: number): void;
  release(vy: number): void;
}

type PointerType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel';

/** Pixels the pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 6;

class SheetGesture {
  private press: { id: number; y: number } | null = null;
  private lastY = 0;
  private tracker = new VelocityTracker();
  private dragging = false;
  /** The click that follows a drag's pointerup belongs to the drag. */
  swallowClick = false;

  constructor(
    private readonly el: HTMLElement,
    private readonly target: SheetDragTarget,
  ) {}

  /** Every press clears the click flag, even one that may not drag. */
  down(event: PointerEvent, allowed: boolean): void {
    this.swallowClick = false;
    if (!allowed || this.press) return;
    if (!event.isPrimary || event.button !== 0) return;
    this.press = { id: event.pointerId, y: event.clientY };
    this.lastY = event.clientY;
    this.tracker = new VelocityTracker();
    this.tracker.add(0, event.clientY, event.timeStamp);
  }

  move(event: PointerEvent): void {
    const { press } = this;
    if (!press || event.pointerId !== press.id) return;
    const moved = Math.abs(event.clientY - press.y);
    if (!this.dragging && moved < DRAG_THRESHOLD_PX) return;
    if (!this.dragging) {
      this.dragging = true;
      this.el.setPointerCapture(event.pointerId);
      this.target.grab();
    }
    this.target.drag(event.clientY - this.lastY);
    this.lastY = event.clientY;
    this.tracker.add(0, event.clientY, event.timeStamp);
  }

  /**
   * The press ends: a drag settles. Only a pointerup is followed by a
   * click to swallow; a pointercancel (`cancelled`) has none.
   */
  up(event: PointerEvent, cancelled: boolean): void {
    if (!this.press || event.pointerId !== this.press.id) return;
    this.press = null;
    if (this.dragging) {
      this.target.release(this.tracker.velocity(event.timeStamp).y);
    }
    this.swallowClick = this.dragging && !cancelled;
    this.dragging = false;
  }
}

/**
 * Listens for drags on `el` that start where `canDrag` allows (not inside
 * a scrolling list); a drag swallows the click that follows it. The press
 * is followed on `moves` until it becomes a drag: the element itself, or
 * the document for a small element the finger leaves at once (the tab
 * bar). Returns the unbind function.
 */
export function bindSheetDrag(
  el: HTMLElement,
  target: SheetDragTarget,
  canDrag: (event: PointerEvent) => boolean,
  moves: EventTarget = el,
): () => void {
  const gesture = new SheetGesture(el, target);
  const on = (e: Event): PointerEvent => e as PointerEvent;
  const binds: [EventTarget, PointerType, (event: Event) => void][] = [
    [el, 'pointerdown', (e) => gesture.down(on(e), canDrag(on(e)))],
    [moves, 'pointermove', (e) => gesture.move(on(e))],
    [moves, 'pointerup', (e) => gesture.up(on(e), false)],
    [moves, 'pointercancel', (e) => gesture.up(on(e), true)],
  ];
  const swallow = (event: Event): void => {
    if (gesture.swallowClick) event.stopPropagation();
    gesture.swallowClick = false;
  };
  for (const [node, type, fn] of binds) node.addEventListener(type, fn);
  el.addEventListener('click', swallow, true);
  return () => {
    for (const [node, type, fn] of binds) node.removeEventListener(type, fn);
    el.removeEventListener('click', swallow, true);
  };
}
