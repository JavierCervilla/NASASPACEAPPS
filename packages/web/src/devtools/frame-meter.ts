/**
 * Frame timing for the performance readout.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */

/** Seconds between readout refreshes. */
const REFRESH_SECONDS = 0.5;

export interface FrameReading {
  readonly fps: number;
  readonly frameMs: number;
  readonly worstMs: number;
}

/** Averages frame times over a window and keeps the slowest frame in it. */
export class FrameMeter {
  private elapsed = 0;
  private frames = 0;
  private worst = 0;
  private readonly window: number;

  constructor(windowSeconds = REFRESH_SECONDS) {
    this.window = windowSeconds;
  }

  /**
   * Adds one frame's duration in seconds; returns a reading once a window is
   * full, otherwise `null`.
   */
  sample(dt: number): FrameReading | null {
    this.elapsed += dt;
    this.frames += 1;
    this.worst = Math.max(this.worst, dt);
    if (this.elapsed < this.window) return null;
    const reading = {
      fps: this.frames / this.elapsed,
      frameMs: (this.elapsed / this.frames) * 1000,
      worstMs: this.worst * 1000,
    };
    this.elapsed = 0;
    this.frames = 0;
    this.worst = 0;
    return reading;
  }
}
