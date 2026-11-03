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
 * The trail of one run of the on-foot view (VENT-49): what it did since it
 * mounted, at most {@link MAX_STEPS} steps with the seconds since the mount,
 * and the last {@link MAX_FRAMES} frames it drew. Steps with one repeat key
 * that follow each other fold into one that counts them, so a minute-by-
 * minute skip or a long drag cannot push the mount and the loads out. The
 * functions take a run and give a new one. Pure.
 */
import type { Environment } from './environment';

/** Steps a run keeps: the newest. */
export const MAX_STEPS = 40;
/** Frames a run keeps: the last drawn. */
export const MAX_FRAMES = 8;

export interface Step {
  /** Seconds since the view mounted. */
  readonly t: number;
  readonly text: string;
  /** How many consecutive steps with this `repeat` key it stands for. */
  readonly count: number;
  readonly repeat: string | null;
}

/** One drawn frame. */
export interface FrameRecord {
  /** Seconds since the view mounted. */
  readonly t: number;
  readonly calls: number;
  readonly triangles: number;
  /** The draw call on the CPU, milliseconds. */
  readonly drawMs: number;
  /** The drawing buffer, «WxH». */
  readonly canvas: string;
}

/** What the renderer holds on the GPU. */
export interface MemoryRecord {
  readonly geometries: number;
  readonly textures: number;
}

export interface Run {
  /** When it began, ISO. */
  readonly startedAt: string;
  readonly env: Environment;
  readonly steps: readonly Step[];
  /** Steps that went past the bound, oldest first. */
  readonly dropped: number;
  readonly frames: readonly FrameRecord[];
  readonly memory: MemoryRecord | null;
}

/** A run that has just begun. */
export const startRun = (startedAt: string, env: Environment): Run =>
  ({ startedAt, env, steps: [], dropped: 0, frames: [], memory: null });

/** `run` with one more step, folded into the last one when it repeats it. */
export function addStep(
  run: Run,
  next: { readonly t: number; readonly text: string;
    readonly repeat: string | null },
): Run {
  const last = run.steps.at(-1);
  const folds = next.repeat !== null && last?.repeat === next.repeat;
  const step: Step = { ...next, count: folds ? (last?.count ?? 0) + 1 : 1 };
  const all = [...run.steps.slice(0, folds ? -1 : undefined), step];
  const over = Math.max(all.length - MAX_STEPS, 0);
  return { ...run, steps: all.slice(over), dropped: run.dropped + over };
}

/** `run` with one more frame, keeping the last {@link MAX_FRAMES}. */
export const addFrame = (run: Run, frame: FrameRecord): Run =>
  ({ ...run, frames: [...run.frames, frame].slice(-MAX_FRAMES) });
