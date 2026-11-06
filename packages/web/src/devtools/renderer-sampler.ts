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
 * Reads an attached renderer once per frame for the performance readout:
 * its totals every frame, its texture memory only every 30 frames or every
 * readout refresh, whichever comes first, because the estimate may walk a
 * whole scene. Counted in frames alone (before VENT-107), a phone's slow
 * frames took seconds to reach 30, and the line kept the 1K map's figure
 * or none after the 2K landed.
 *
 * Split out of dev-tools.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/dev-tools.ts`).
 */
import { REFRESH_SECONDS } from './frame-meter';
import type { RenderStats } from './readout';
import type { RendererAdapter } from './renderer';

/** Frames between texture memory estimates, at most. */
const TEXTURE_MEMORY_FRAMES = 30;

export class RendererSampler {
  private readonly renderer: RendererAdapter;
  private textureMB: number | undefined;
  /** Since the last estimate; Infinity estimates at the first frame. */
  private sinceEstimate = { frames: Infinity, seconds: Infinity };

  constructor(renderer: RendererAdapter) {
    this.renderer = renderer;
  }

  /**
   * Reads a frame that took `dt` seconds and starts the next frame's
   * totals.
   */
  read(dt: number): RenderStats {
    const { renderer } = this;
    if (renderer.textureBytes && this.estimateDue(dt)) {
      this.textureMB = renderer.textureBytes() / 1e6;
      this.sinceEstimate = { frames: 0, seconds: 0 };
    }
    const reading = renderer.read();
    renderer.reset?.();
    if (this.textureMB === undefined) return reading;
    return { ...reading, textureMB: this.textureMB };
  }

  /** Counts a frame of `dt` seconds; whether an estimate is due at it. */
  private estimateDue(dt: number): boolean {
    const since = this.sinceEstimate;
    since.frames += 1;
    since.seconds += dt;
    return since.frames >= TEXTURE_MEMORY_FRAMES
      || since.seconds >= REFRESH_SECONDS;
  }
}
