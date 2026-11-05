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
 * The globe's programs, compiled before the frame that needs them
 * (VENT-93). Drawn first, a program is finished on the spot: the VENT-80
 * phone profile spent 1.47 s there. Where the browser has
 * KHR_parallel_shader_compile, three's `compileAsync` builds them while
 * nothing is drawn and the frames wait (as the on-foot view does,
 * terrain/scene/scene-compile.ts); one frame is asked once they are ready.
 * The first frame asked starts the scene's compile, so the scene is whole
 * by then (the Sun is a light); a new look (a map going onto the Moon)
 * asks its own. Without the extension `compileAsync` only waits a timer
 * before the same stall, so the gate does nothing and the first frame is
 * as early as before. A compile that never ends (a lost context) is given
 * up.
 */
import type { FrameFn } from './loop';
import type { Stage } from './stage';

/** Past this the frames draw regardless, compiling what is left. */
export const COMPILE_GIVE_UP_MS = 5000;

export interface CompileGate {
  /** Whether a frame may draw: no compile is pending. */
  readonly open: () => boolean;
  /** `draw`, held while a compile is pending; the first call compiles. */
  readonly gated: (draw: FrameFn) => FrameFn;
  /** Compiles the scene as it is now; resolves once the frames may draw. */
  readonly compile: () => Promise<void>;
}

export interface CompileGateDeps {
  /** The browser has KHR_parallel_shader_compile. */
  readonly parallel: boolean;
  readonly compileAsync: () => Promise<unknown>;
  /** Asks for a frame. */
  readonly invalidate: () => void;
  /** Resolves after `ms` milliseconds. */
  readonly wait: (ms: number) => Promise<void>;
}

/** Holds the frames while the programs compile. */
export class CompileHold implements CompileGate {
  private pending = 0;
  private started = false;

  constructor(private readonly deps: CompileGateDeps) {}

  readonly open = (): boolean => this.pending === 0;

  readonly gated = (draw: FrameFn): FrameFn => (dt) => {
    if (!this.started) void this.compile();
    this.started = true;
    return this.open() && draw(dt);
  };

  readonly compile = async (): Promise<void> => {
    const { deps } = this;
    if (!deps.parallel) return;
    this.pending += 1;
    const work = new Promise((resolve) => resolve(deps.compileAsync()));
    await Promise.race([work, deps.wait(COMPILE_GIVE_UP_MS)])
      .catch(() => undefined);
    this.pending -= 1;
    deps.invalidate();
  };
}

/** The gate of `stage`'s scene, seen by its camera. */
export function stageCompileGate(
  stage: Stage,
  invalidate: () => void,
): CompileGate {
  const { renderer, scene, camera } = stage;
  return new CompileHold({
    parallel: renderer.extensions.has('KHR_parallel_shader_compile'),
    compileAsync: () => renderer.compileAsync(scene, camera),
    invalidate,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
}
