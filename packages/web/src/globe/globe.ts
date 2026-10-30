/**
 * The lunar globe, mounted into a host element: the entry point the island
 * loads with a dynamic import, so Three.js reaches only desktop browsers.
 */
import { subSolarPoint } from '@ventana/sim';
import { attachDevTools } from './dev-hook';
import { bindDrag } from './drag';
import { drawFrame } from './frame';
import { SOUTH_POLE_VIEW } from './framing';
import { keyControls } from './key-controls';
import { bindKeys, bindWheel } from './keys';
import { createLoop, type Loop } from './loop';
import { MarkerLayer } from './marker-layer';
import { addMoon } from './moon';
import { createOrbit, type Orbit } from './orbit';
import { pointerControls } from './pointer-controls';
import { pickQuality, textureUrl } from './quality-pick';
import { loadSites } from './sites-client';
import { createStage, disposeStage, resizeStage, type Stage } from './stage';

export interface GlobeOptions {
  /** The instant whose Sun lights the globe, Unix ms. */
  readonly atMs: number;
  /** The site's base path (`import.meta.env.BASE_URL`). */
  readonly base: string;
  readonly sitesUrl: string;
  /** The site selected at start, if it is in the list. */
  readonly selectedId: string | null;
  readonly reducedMotion: () => boolean;
  readonly warn: (message: string) => void;
}

/** Keeps the canvas the host's size; redraws after a restored context. */
function watchHost(host: HTMLElement, stage: Stage, loop: Loop): () => void {
  const fit = (): void => {
    resizeStage(stage, host.clientWidth, host.clientHeight);
    loop.invalidate();
  };
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  fit();
  const canvas = stage.renderer.domElement;
  const restored = (): void => loop.invalidate();
  canvas.addEventListener('webglcontextrestored', restored);
  return () => {
    observer.disconnect();
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}

/** Drag, keys and wheel on `host`; returns the unbind functions. */
function bindInput(
  host: HTMLElement,
  orbit: Orbit,
  loop: Loop,
  reducedMotion: () => boolean,
): (() => void)[] {
  const deps = {
    invalidate: () => loop.invalidate(),
    reducedMotion,
    heightPx: () => host.clientHeight,
  };
  const keys = keyControls(orbit, deps);
  return [
    bindDrag(host, pointerControls(orbit, deps)),
    bindKeys(host, keys),
    bindWheel(host, keys),
  ];
}

/**
 * Mounts the globe in `host` and returns its teardown. Throws when the
 * browser has no WebGL; the caller shows the text alternative instead.
 */
export function mountGlobe(host: HTMLElement, options: GlobeOptions) {
  const quality = pickQuality();
  const stage = createStage(host, quality);
  const orbit = createOrbit(SOUTH_POLE_VIEW);
  const invalidate = (): void => loop.invalidate();
  const markers = new MarkerLayer(host, options.selectedId, invalidate);
  const loop = createLoop((dt) => drawFrame({ stage, orbit, markers }, dt));
  const moon = addMoon(stage.scene, {
    textureUrl: textureUrl(quality, options.base),
    sun: subSolarPoint(options.atMs),
    onChange: invalidate,
    warn: options.warn,
  });
  const input = bindInput(host, orbit, loop, options.reducedMotion);
  const unbind = [watchHost(host, stage, loop), ...input];
  const get = globalThis.fetch.bind(globalThis);
  void loadSites({ fetch: get, url: options.sitesUrl, warn: options.warn })
    .then((sites) => markers.setSites(sites));
  void attachDevTools(stage.renderer, moon.textureBytes);
  return () => {
    loop.stop();
    [...unbind, () => markers.dispose(), moon.dispose].forEach((fn) => fn());
    disposeStage(stage);
  };
}
