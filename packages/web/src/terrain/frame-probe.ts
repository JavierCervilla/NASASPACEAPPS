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
 * The frame-cost probe (VENT-49): while the view loads, each frame is timed
 * as its draw plus a wait for the GPU (a 1 x 1 `readPixels`; Android exposes
 * no timer queries), and one frame over {@link SLOW_FRAME_FACTOR} target
 * frame times tells the view to step down a tier. The window is every frame
 * until the slicer's work is all run and the next {@link SETTLE_FRAMES};
 * past it no frame pays the wait. A frame that compiled a shader program has
 * the driver's one-off compile in it, so it is judged against the larger of
 * the budget and {@link COMPILED_FRAME_CEILING_MS}, not skipped (VENT-69:
 * a 1.6 s first frame passed unjudged and the GPU reset). The clock and the
 * wait are injected, so none of it needs a GPU.
 */

/** A frame is slow past this many target frame times. */
export const SLOW_FRAME_FACTOR = 4;
/**
 * What a frame that compiled a program may cost, milliseconds: a hard
 * ceiling, since the compile is not what the tier's budget is about.
 */
export const COMPILED_FRAME_CEILING_MS = 1000;
/** Frames timed after the slicer's work is all run. */
export const SETTLE_FRAMES = 3;

/** The slow-frame budget of a tier aiming at `targetFps`, milliseconds. */
export const budgetOf = (targetFps: number): number =>
  (SLOW_FRAME_FACTOR * 1000) / targetFps;

/** The verdict on the frames timed: slow when any is over the budget. */
export function probeVerdict(
  samplesMs: readonly number[],
  budgetMs: number,
): 'ok' | 'slow' {
  return samplesMs.some((ms) => ms > budgetMs) ? 'slow' : 'ok';
}

export interface ProbeDeps {
  readonly budgetMs: number;
  /** Milliseconds on a monotonic clock. */
  readonly now: () => number;
  /** Returns once the GPU has finished what was drawn. */
  readonly sync: () => void;
  /** How many shader programs exist: a frame that adds one has the ceiling. */
  readonly programs: () => number;
  /** Called once, on the first slow frame; absent: the probe is off. */
  readonly onSlow: (() => void) | undefined;
}

export interface FrameProbe {
  /**
   * Draws a frame, timed while the window is open. `busy` says whether the
   * slicer still has work, asked after the draw.
   */
  readonly frame: (draw: () => void, busy: () => boolean) => void;
}

/** One frame drawn and waited for: its cost and the budget it answers to. */
function timeFrame(
  deps: ProbeDeps,
  draw: () => void,
): { ms: number; budget: number } {
  const programs = deps.programs();
  const start = deps.now();
  draw();
  deps.sync();
  const compiled = deps.programs() !== programs;
  return { ms: deps.now() - start, budget: compiled
    ? Math.max(deps.budgetMs, COMPILED_FRAME_CEILING_MS) : deps.budgetMs };
}

export function createFrameProbe(deps: ProbeDeps): FrameProbe {
  let open = deps.onSlow !== undefined;
  /** Frames left after the slicer finished; null while it works. */
  let after: number | null = null;
  return {
    frame: (draw, busy) => {
      if (!open) return draw();
      const { ms, budget } = timeFrame(deps, draw);
      if (probeVerdict([ms], budget) === 'slow') {
        open = false;
        return deps.onSlow?.();
      }
      if (after !== null) after -= 1;
      else if (!busy()) after = SETTLE_FRAMES;
      open = after !== 0;
      return undefined;
    },
  };
}
