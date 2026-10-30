/**
 * Hands the renderer to the dev tools (performance readout, context watch),
 * as packages/web/src/devtools/boot.ts documents. In a production build the
 * condition is a constant false and the bundler drops the import, which
 * scripts/check-no-devtools.mjs proves after every build.
 */
import type { WebGLRenderer } from 'three';

export async function attachDevTools(
  renderer: WebGLRenderer,
  textureBytes: () => number,
): Promise<void> {
  if (import.meta.env.DEV || import.meta.env.PUBLIC_PERF_HUD === '1') {
    const { devTools, threeAdapter } = await import('../devtools/boot');
    (await devTools()).attach(threeAdapter(renderer, { textureBytes }));
  }
}
