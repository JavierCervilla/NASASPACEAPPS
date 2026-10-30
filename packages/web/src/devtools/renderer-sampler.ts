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
 * its totals every frame, its texture memory only every few frames, because
 * the estimate may walk a whole scene.
 *
 * Split out of dev-tools.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/dev-tools.ts`).
 */
import type { RenderStats } from './readout';
import type { RendererAdapter } from './renderer';

/** Frames between texture memory estimates. */
const TEXTURE_MEMORY_FRAMES = 30;

export class RendererSampler {
  private readonly renderer: RendererAdapter;
  private textureMB: number | undefined;

  constructor(renderer: RendererAdapter) {
    this.renderer = renderer;
  }

  /** Reads frame number `frame` and starts the next frame's totals. */
  read(frame: number): RenderStats {
    const { renderer } = this;
    const estimate = frame % TEXTURE_MEMORY_FRAMES === 1;
    if (renderer.textureBytes && estimate) {
      this.textureMB = renderer.textureBytes() / 1e6;
    }
    const reading = renderer.read();
    renderer.reset?.();
    if (this.textureMB === undefined) return reading;
    return { ...reading, textureMB: this.textureMB };
  }
}
