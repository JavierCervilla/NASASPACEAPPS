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
 * The lunar globe, mounted into a host element: the entry point the island
 * loads with a dynamic import, so Three.js downloads only once the page
 * asks for it (boot.ts).
 */
import type { TimeStore } from '../calendar/time-store';
import type { CalloutContent } from '../callout/callout-content';
import { isPhoneViewport } from '../lib/viewport';
import type { WatchedValue } from '../lib/watched-value';
import type { SiteStore } from '../phone/site-store';
import { attachDevTools } from './dev-hook';
import { watchCallout, type CalloutAnchors } from './callout-watch';
import { bindDrag } from './drag';
import { drawFrame } from './frame';
import { SOUTH_POLE_VIEW } from './framing';
import { keyControls } from './key-controls';
import { bindKeys, bindWheel } from './keys';
import { createLoop, type Loop } from './loop';
import { MarkerLayer } from './marker-layer';
import type { GlobeSite } from './markers';
import { addMoon } from './moon';
import { createOrbit, type Orbit } from './orbit';
import { bindPinch } from './pinch';
import { pinchControls, pointerControls } from './pointer-controls';
import { pickQuality } from './quality-pick';
import { bindSheetEdge, frameInset } from './sheet-edge';
import { bindSelection, type SelectionParts } from './selection';
import { loadSites } from './sites-client';
import { createStage, disposeStage, resizeStage, type Stage } from './stage';
import { bindSun } from './sun-light';

export interface GlobeOptions {
  /** The selected instant: its Sun lights the globe. */
  readonly time: Pick<TimeStore, 'get' | 'subscribe'>;
  /** The site's base path (`import.meta.env.BASE_URL`). */
  readonly base: string;
  readonly sitesUrl: string;
  /** The selected site, shared with the phone sheet. */
  readonly store: SiteStore;
  /** The phone sheet's top edge, px from the viewport's top; null: none. */
  readonly sheetEdge: WatchedValue<number | null>;
  /** What the selected site's callout says, kept by the page. */
  readonly callout: WatchedValue<CalloutContent | null>;
  /** The page's elements the callout docks against. */
  readonly anchors: () => CalloutAnchors;
  /** The browser asks to save data: the globe keeps its start map. */
  readonly saveData: boolean;
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

/** Drag, pinch, keys and wheel on `host`; returns the unbind functions. */
function bindInput(
  host: HTMLElement,
  orbit: Orbit,
  loop: Loop,
  reducedMotion: () => boolean,
): (() => void)[] {
  const deps = {
    invalidate: () => loop.invalidate(),
    reducedMotion,
    // The Moon is scaled for its frame, not the whole canvas.
    heightPx: () => host.clientHeight - frameInset(host),
  };
  const keys = keyControls(orbit, deps);
  return [
    bindDrag(host, pointerControls(orbit, deps)),
    bindPinch(host, pinchControls(orbit, deps)),
    bindKeys(host, keys),
    bindWheel(host, keys),
  ];
}

/** Shows the page's callout content and keeps the callout measured. */
function bindCallout(
  host: HTMLElement,
  options: Pick<GlobeOptions, 'callout' | 'anchors'>,
  markers: MarkerLayer,
  invalidate: () => void,
): () => void {
  const { callout } = markers;
  const show = (): void => {
    callout.show(options.callout.get());
    invalidate();
  };
  show();
  const unsubscribe = options.callout.subscribe(show);
  const { anchors } = options;
  const phone = isPhoneViewport;
  const unwatch = watchCallout({ host, callout, anchors, phone });
  return () => [unsubscribe, unwatch].forEach((unbind) => unbind());
}

/**
 * Binds the markers to the page: loads the API sites into them, follows
 * the shared selection and shows the callout, above the phone sheet.
 */
function bindSites(
  host: HTMLElement,
  options: GlobeOptions,
  globe: Pick<SelectionParts, 'markers' | 'orbit' | 'invalidate'> &
    Pick<Stage, 'camera'>,
): () => void {
  const { markers, orbit, invalidate, camera } = globe;
  let sites: readonly GlobeSite[] = [];
  const get = globalThis.fetch.bind(globalThis);
  void loadSites({ fetch: get, url: options.sitesUrl, warn: options.warn })
    .then((loaded) => {
      sites = loaded;
      markers.setSites(loaded);
    });
  const { store, reducedMotion } = options;
  const parts = { store, markers, orbit, invalidate, reducedMotion };
  const unbindSelection = bindSelection(parts, () => sites);
  const edgeParts = { camera, markers, invalidate };
  const unbindEdge = bindSheetEdge(host, edgeParts, options.sheetEdge);
  const unbindCallout = bindCallout(host, options, markers, invalidate);
  return () => {
    [unbindSelection, unbindEdge, unbindCallout].forEach((fn) => fn());
  };
}

/**
 * Mounts the globe in `host` and returns its teardown. Throws when the
 * browser has no WebGL; the caller shows the text alternative instead.
 */
export function mountGlobe(host: HTMLElement, options: GlobeOptions) {
  const quality = pickQuality(isPhoneViewport());
  const stage = createStage(host, quality);
  const orbit = createOrbit(SOUTH_POLE_VIEW);
  const invalidate = (): void => loop.invalidate();
  const { store } = options;
  const pick = (id: string): void => store.select(id, 'globe');
  const markers = new MarkerLayer(host, store.get().id, invalidate, pick);
  const tier = quality.tier;
  const moon = addMoon(stage, { ...options, tier, onChange: invalidate });
  const parts = { stage, orbit, markers, moon };
  const loop = createLoop((dt) => drawFrame(parts, dt));
  const input = bindInput(host, orbit, loop, options.reducedMotion);
  const { camera } = stage;
  const globeParts = { markers, orbit, invalidate, camera };
  const sites = bindSites(host, options, globeParts);
  const sun = bindSun(stage.scene, options.time, invalidate);
  const unbind = [watchHost(host, stage, loop), ...input, sites, sun];
  void attachDevTools(stage.renderer, moon.textureBytes);
  return () => {
    loop.stop();
    [...unbind, () => markers.dispose(), moon.dispose].forEach((fn) => fn());
    disposeStage(stage);
  };
}
