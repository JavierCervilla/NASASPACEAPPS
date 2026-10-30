/**
 * Two-finger pinch to zoom, with Pointer Events: the zoom follows the
 * change of distance between the fingers, 1:1 (apple-design §2). The drag
 * gesture steps aside when the second finger lands (drag.ts).
 */

type PointerType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel';

interface Point {
  readonly x: number;
  readonly y: number;
}

/** The distance between two fingers, or 0 unless exactly two are down. */
export function spreadOf(points: ReadonlyMap<number, Point>): number {
  const [a, b, extra] = [...points.values()];
  if (!a || !b || extra) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The fingers down and how far apart the two of a pinch are. */
class PinchTracker {
  private readonly points = new Map<number, Point>();
  private spread = 0;

  constructor(private readonly zoom: (ratio: number) => void) {}

  /** A finger lands (`down`) or lifts. */
  press(event: PointerEvent, down: boolean): void {
    const point = { x: event.clientX, y: event.clientY };
    if (down) this.points.set(event.pointerId, point);
    else this.points.delete(event.pointerId);
    this.spread = spreadOf(this.points);
  }

  /** A finger moves: the zoom follows the new spread. */
  move(event: PointerEvent): void {
    if (!this.points.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    this.points.set(event.pointerId, point);
    const next = spreadOf(this.points);
    if (this.spread > 0 && next > 0) this.zoom(next / this.spread);
    this.spread = next;
  }
}

/**
 * Calls `zoom` with each change of spread (2 = the fingers twice as far
 * apart); returns the unbind.
 */
export function bindPinch(
  el: HTMLElement,
  zoom: (ratio: number) => void,
): () => void {
  const pinch = new PinchTracker(zoom);
  const listeners: [PointerType, (event: PointerEvent) => void][] = [
    ['pointerdown', (e) => pinch.press(e, true)],
    ['pointermove', (e) => pinch.move(e)],
    ['pointerup', (e) => pinch.press(e, false)],
    ['pointercancel', (e) => pinch.press(e, false)],
  ];
  for (const [type, fn] of listeners) el.addEventListener(type, fn);
  return () => {
    for (const [type, fn] of listeners) el.removeEventListener(type, fn);
  };
}
