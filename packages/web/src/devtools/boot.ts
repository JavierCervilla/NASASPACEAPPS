/**
 * Starts the dev tools once per page. Base.astro imports this module only in dev builds; a renderer added later
 * reaches the same instance through the same guarded dynamic import and calls `attach` on it:
 *
 *   if (import.meta.env.DEV || import.meta.env.PUBLIC_PERF_HUD === '1') {
 *     const { devTools } = await import('../devtools/boot');
 *     (await devTools()).attach(threeAdapter(renderer));
 *   }
 */
import { DevTools } from './dev-tools';
import { detectTier, deviceHints } from '../lib/quality';

export { threeAdapter } from './renderer';

let started: Promise<DevTools> | null = null;

export function devTools(): Promise<DevTools> {
  started ??= start();
  return started;
}

async function start(): Promise<DevTools> {
  // A throwaway context tells the GPU's name; it is given back at once, since a device allows few contexts.
  const probe = document.createElement('canvas').getContext('webgl2');
  const device = deviceHints(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const tier = detectTier(device, window.location.search, window.location.hash);
  const tools = await DevTools.start({ tier, gpu: device.gpu, hash: window.location.hash });
  tools.run();
  return tools;
}
