/**
 * Draws on demand: a frame runs only after something changed, and the loop
 * keeps going only while the frame says it still moves. An idle globe costs
 * no GPU time.
 */

/** Draws one frame `dt` seconds after the last; true to ask for another. */
export type FrameFn = (dt: number) => boolean;

export interface Loop {
  /** Asks for a frame (starts the loop when it is idle). */
  invalidate(): void;
  /** Cancels the pending frame for good. */
  stop(): void;
}

/** Frame times above this (a hidden tab, a debugger pause) are clamped. */
const MAX_DT_S = 1 / 20;

export function createLoop(
  frame: FrameFn,
  schedule: (fn: (now: number) => void) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
): Loop {
  let pending: number | null = null;
  let last: number | null = null;
  let stopped = false;
  const tick = (now: number): void => {
    const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_DT_S);
    pending = null;
    last = frame(dt) ? now : null;
    if (last !== null && !stopped) pending = schedule(tick);
  };
  return {
    invalidate: () => {
      if (pending === null && !stopped) pending = schedule(tick);
    },
    stop: () => {
      stopped = true;
      if (pending !== null) cancel(pending);
    },
  };
}
