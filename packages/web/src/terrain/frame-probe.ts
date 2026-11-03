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
 * past it no frame pays the wait. A frame that compiled a shader program is
 * not judged: the compile is the driver's, once, not what the GPU costs per
 * frame. The clock and the wait are injected, so none of it needs a GPU.
 */

/** A frame is slow past this many target frame times. */
export const SLOW_FRAME_FACTOR = 4;
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
  /** How many shader programs exist: a frame that adds one is not judged. */
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

export function createFrameProbe(deps: ProbeDeps): FrameProbe {
  let open = deps.onSlow !== undefined;
  /** Frames left after the slicer finished; null while it works. */
  let after: number | null = null;
  const timed = (draw: () => void): number | null => {
    const programs = deps.programs();
    const start = deps.now();
    draw();
    deps.sync();
    return deps.programs() === programs ? deps.now() - start : null;
  };
  return {
    frame: (draw, busy) => {
      if (!open) return draw();
      const ms = timed(draw);
      if (ms !== null && probeVerdict([ms], deps.budgetMs) === 'slow') {
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
