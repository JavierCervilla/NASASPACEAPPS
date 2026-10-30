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
