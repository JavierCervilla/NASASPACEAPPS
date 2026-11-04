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
 * The scene's programs, compiled before its first frame (VENT-69). The
 * ground's fragment shaders are about 85 kB of GLSL each; compiled inside
 * the first draw, as VENT-62's were, a Pixel 10 spent 1.6 s in that frame
 * and the GPU reset. `compileAsync` builds them while nothing is drawn (in
 * parallel where the browser has `KHR_parallel_shader_compile`), the loop
 * stays shut until they are ready, and the wait is timed: past
 * {@link COMPILE_BUDGET_MS} the view steps down a tier, as a slow frame does.
 * Ring meshes do not exist yet when this runs: scene-warm-up.ts stands
 * in for them. The gate that keeps the loop shut is loop-gate.ts.
 */
import { COMPILED_FRAME_CEILING_MS } from '../frame-probe';

/**
 * A cold compile slower than this is the device telling the tier is too
 * heavy: the incident's 1.6 s was over it and a warm cache takes tens of
 * milliseconds. It is the frame probe's ceiling for a frame that compiles,
 * so the two judge the same compile the same way.
 */
export const COMPILE_BUDGET_MS = COMPILED_FRAME_CEILING_MS;
/** Past this the wait is given up and the first frame draws regardless. */
export const COMPILE_GIVE_UP_MS = 5000;

/**
 * Past this the surface maps (regolith, Blue Marble) are no longer waited
 * for: the view compiles and draws without them, as before VENT-69, and they
 * go on when they land.
 */
export const MAPS_GIVE_UP_MS = 5000;

/** Waits for `work`, at most `ms`; which of the two came first. */
export async function waitAtMost(
  work: Promise<unknown>,
  ms: number,
  wait: (ms: number) => Promise<void>,
): Promise<'done' | 'timeout'> {
  return Promise.race([work.then(() => 'done' as const),
    wait(ms).then(() => 'timeout' as const)]);
}

/** The verdict on a compile that took `ms`. */
export const compileVerdict = (ms: number): 'ok' | 'slow' =>
  ms > COMPILE_BUDGET_MS ? 'slow' : 'ok';

export interface CompileDeps {
  readonly compile: () => Promise<unknown>;
  readonly now: () => number;
  /** Resolves after `ms` milliseconds. */
  readonly wait: (ms: number) => Promise<void>;
  /** Tells the crash report. */
  readonly note: (text: string) => void;
  /** The page was hidden at some point of the compile (not a GPU's time). */
  readonly hidden: () => boolean;
  /** The tier steps down; absent when it may not. */
  readonly onSlow: (() => void) | undefined;
}

/**
 * Runs the compile, timed. A compile that fails or never ends does not stop
 * the view: it is noted and the first frame compiles what is left. Returns
 * the milliseconds the wait took.
 */
export async function compileFirst(deps: CompileDeps): Promise<number> {
  const start = deps.now();
  try {
    await Promise.race([deps.compile(), deps.wait(COMPILE_GIVE_UP_MS)]);
  } catch (error) {
    deps.note(`program compile failed: ${String(error)}`);
  }
  const ms = deps.now() - start;
  const unjudged = deps.hidden();
  const slow = !unjudged && compileVerdict(ms) === 'slow';
  const verdict = unjudged ? ', page was hidden: not judged'
    : slow ? ', over the budget' : '';
  deps.note(`programs compiled in ${Math.round(ms)} ms${verdict}`);
  if (slow) deps.onSlow?.();
  return ms;
}
