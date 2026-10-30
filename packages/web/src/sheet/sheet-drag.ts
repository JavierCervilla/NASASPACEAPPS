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
  dragging = false;

  constructor(
    private readonly el: HTMLElement,
    private readonly target: SheetDragTarget,
  ) {}

  down(event: PointerEvent): void {
    if (this.press || !event.isPrimary || event.button !== 0) return;
    this.press = { id: event.pointerId, y: event.clientY };
    this.lastY = event.clientY;
    this.dragging = false;
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

  up(event: PointerEvent): void {
    if (!this.press || event.pointerId !== this.press.id) return;
    this.press = null;
    if (this.dragging) {
      this.target.release(this.tracker.velocity(event.timeStamp).y);
    }
  }
}

/**
 * Listens for drags on `el` that start where `canDrag` allows (not inside
 * a scrolling list); a drag swallows the click that follows it. Returns
 * the unbind function.
 */
export function bindSheetDrag(
  el: HTMLElement,
  target: SheetDragTarget,
  canDrag: (event: PointerEvent) => boolean,
): () => void {
  const gesture = new SheetGesture(el, target);
  const listeners: [PointerType, (event: PointerEvent) => void][] = [
    ['pointerdown', (e) => (canDrag(e) ? gesture.down(e) : undefined)],
    ['pointermove', (e) => gesture.move(e)],
    ['pointerup', (e) => gesture.up(e)],
    ['pointercancel', (e) => gesture.up(e)],
  ];
  const swallow = (event: Event): void => {
    if (gesture.dragging) event.stopPropagation();
    gesture.dragging = false;
  };
  for (const [type, fn] of listeners) el.addEventListener(type, fn);
  el.addEventListener('click', swallow, true);
  return () => {
    for (const [type, fn] of listeners) el.removeEventListener(type, fn);
    el.removeEventListener('click', swallow, true);
  };
}
