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
 * The frame probe that keeps Liquid honest: after a short warm-up it
 * times every frame for about two seconds, and Liquid stays only if the
 * 90th percentile frame time holds the quality tier's budget (its target
 * frame rate, with some slack for vsync jitter). The clock and the frame
 * scheduler come in, so it runs in a test without a browser. Pure.
 */

/** Frames before this are not timed: the page is still settling, ms. */
export const WARMUP_MS = 500;
/** How long the frames are timed for, ms. */
export const PROBE_MS = 2000;
/** A frame may take this much longer than the target before it counts. */
export const BUDGET_SLACK = 1.25;

export interface ProbeDeps {
  /** Schedules `fn` for the next frame (requestAnimationFrame). */
  readonly frame: (fn: () => void) => unknown;
  /** ms, monotonic (performance.now). */
  readonly now: () => number;
  /** The tier's target frame rate. */
  readonly targetFps: number;
}

/** The value 90 % of `samples` are at or below; 0 for none. */
export function p90(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.9) - 1] ?? 0;
}

/** Whether a p90 frame time of `ms` misses the budget of `targetFps`. */
export function overBudget(ms: number, targetFps: number): boolean {
  return ms > (1000 / targetFps) * BUDGET_SLACK;
}

/**
 * Times the frames and calls `done` once with whether they held the
 * budget, and the p90 frame time in ms.
 */
export function probeFrames(
  deps: ProbeDeps,
  done: (holds: boolean, p90Ms: number) => void,
): void {
  const start = deps.now();
  const samples: number[] = [];
  let last: number | null = null;
  const tick = (): void => {
    const now = deps.now();
    if (now - start >= WARMUP_MS && last !== null) samples.push(now - last);
    last = now;
    if (now - start < WARMUP_MS + PROBE_MS) {
      deps.frame(tick);
      return;
    }
    const ms = p90(samples);
    done(!overBudget(ms, deps.targetFps), ms);
  };
  deps.frame(tick);
}
