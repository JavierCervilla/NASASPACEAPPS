/**
 * Starts the globe only on a desktop-sized viewport. On a phone the globe
 * section is hidden (globe.css) and this never imports `./globe`, so neither
 * Three.js nor the Moon texture is downloaded there. A window that grows to
 * desktop size later starts it then.
 */
import type { GlobeOptions } from './globe';

/** Must match the breakpoint in styles/globe.css. */
export const DESKTOP_QUERY = '(min-width: 768px)';

/** How the start went: drawing, or no WebGL (or the chunk failed). */
export type GlobeStatus =
  | { readonly kind: 'ready'; readonly atMs: number }
  | { readonly kind: 'unavailable' };

const NOTHING = (): void => undefined;

interface Outcome {
  readonly dispose: (() => void) | null;
  readonly status: GlobeStatus;
}

async function mount(
  host: HTMLElement,
  options: GlobeOptions,
  cancelled: () => boolean,
): Promise<Outcome> {
  try {
    const { mountGlobe } = await import('./globe');
    const dispose = cancelled() ? null : mountGlobe(host, options);
    return { dispose, status: { kind: 'ready', atMs: options.atMs } };
  } catch (error) {
    options.warn(`Ventana Lunar: the 3D globe could not start (${String(error)}).`);
    return { dispose: null, status: { kind: 'unavailable' } };
  }
}

/**
 * Mounts the globe in `host` once the viewport is desktop-sized and reports
 * the outcome; returns the teardown.
 */
export function startWhenDesktop(
  host: HTMLElement,
  options: GlobeOptions,
  onStatus: (status: GlobeStatus) => void,
): () => void {
  const media = matchMedia(DESKTOP_QUERY);
  const state = { started: false, cancelled: false, dispose: NOTHING };
  const start = (): void => {
    if (!media.matches || state.started) return;
    state.started = true;
    media.removeEventListener('change', start);
    void mount(host, options, () => state.cancelled).then((outcome) => {
      state.dispose = outcome.dispose ?? NOTHING;
      if (state.cancelled) state.dispose();
      else onStatus(outcome.status);
    });
  };
  media.addEventListener('change', start);
  start();
  return () => {
    state.cancelled = true;
    media.removeEventListener('change', start);
    state.dispose();
  };
}
