/**
 * The pointer's recent path, to tell a flick from a slow drag at release
 * (apple-design: track a short history, not just the last point).
 */

interface Sample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/** Only the last stretch of the gesture counts toward its velocity. */
const WINDOW_MS = 100;

/** Pointer positions, in px, of the last {@link WINDOW_MS} ms. */
export class VelocityTracker {
  private samples: Sample[] = [];

  /** Records the pointer at `x`, `y` px at time `t` ms. */
  add(x: number, y: number, t: number): void {
    this.samples.push({ x, y, t });
    this.samples = this.samples.filter((s) => t - s.t <= WINDOW_MS);
  }

  /**
   * Velocity in px per second at time `now` ms; zero when the pointer
   * rested for longer than the window before release.
   */
  velocity(now: number): { x: number; y: number } {
    const recent = this.samples.filter((s) => now - s.t <= WINDOW_MS);
    const first = recent[0];
    const last = recent.at(-1);
    if (!first || !last || last.t === first.t) return { x: 0, y: 0 };
    const seconds = (last.t - first.t) / 1000;
    return { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
  }
}
