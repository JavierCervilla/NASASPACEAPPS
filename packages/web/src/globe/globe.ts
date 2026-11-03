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
import { isPhoneViewport } from '../lib/viewport';
import type { WatchedValue } from '../lib/watched-value';
import type { SiteStore } from '../phone/site-store';
import type { NowState } from '../phone/widget-types';
import { watchBand, type BandAnchors } from './band-watch';
import { linkCompass, type GlobeCompass } from './compass-link';
import { attachDevTools } from './dev-hook';
import { bindDrag } from './drag';
import { drawFrame } from './frame';
import type { GlobeView } from './globe-view';
import { SOUTH_POLE_VIEW } from './framing';
import { FreeBandWatch } from './free-band';
import { keyControls } from './key-controls';
import { bindKeys, bindWheel } from './keys';
import { createLoop, type Loop } from './loop';
import type { MarkerLayer } from './marker-layer';
import { linkView } from './view-link';
import type { LayerRegistry } from './layers/registry';
import type { GlobeSite } from './markers';
import { createOrbit, type Orbit } from './orbit';
import { bindPinch } from './pinch';
import { pinchControls, pointerControls } from './pointer-controls';
import { pickQuality } from './quality-pick';
import { bindSheetEdge, frameInset } from './sheet-edge';
import { loadSelection, type SelectionParts } from './selection';
import { createSiteFramer, type SiteFramerParts } from './site-framer';
import type { GraticuleText } from './graticule/text';
import { addContents } from './contents';
import { createStage, disposeStage, resizeStage, type Stage } from './stage';
import { shownFrames, type ShownFrames } from './shown-frames';
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
  /** The selected site's state, which its marker wears. */
  readonly state: WatchedValue<NowState | null>;
  /** The page's elements the free band is measured from. */
  readonly anchors: () => BandAnchors;
  /** The browser asks to save data: the globe keeps its start map. */
  readonly saveData: boolean;
  readonly reducedMotion: () => boolean;
  readonly warn: (message: string) => void;
  /** A marker's accessible name, in the visitor's language. */
  readonly markerName: (site: GlobeSite) => string;
  /** The first map is on the Moon: the loading state may go. */
  readonly onTextured?: () => void;
  /**
   * Hears the globe as a place to drop the pin on, once mounted, and null
   * once gone (VENT-10).
   */
  readonly onView?: (view: GlobeView | null) => void;
  /**
   * Hears the globe's compass, once mounted, and null once gone
   * (VENT-50): the camera, the way back to the opening view, the frames.
   */
  readonly onCompass?: (compass: GlobeCompass | null) => void;
  /** The words on the graticule's labels, in the visitor's language. */
  readonly graticuleText: GraticuleText;
  /**
   * The page's globe layers (VENT-37): mounted while the globe runs, with
   * the landing sites and the approximate zones registered on it.
   */
  readonly layers?: LayerRegistry;
}

/**
 * Keeps the canvas the host's size, but not a hidden host's 0 x 0, and
 * draws nothing while hidden (shown-frames.ts); redraws after a restored
 * context.
 */
function watchHost(
  host: HTMLElement,
  stage: Stage,
  loop: Loop,
  frames: ShownFrames,
): () => void {
  const fit = (): void => frames.fit({
    size: () => ({ width: host.clientWidth, height: host.clientHeight }),
    resize: (width, height) => resizeStage(stage, width, height),
    invalidate: () => loop.invalidate(),
  });
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

/**
 * The selected marker wears the page's state of the selected site, and its
 * ring pulses again when that state changes.
 */
function bindState(
  state: GlobeOptions['state'],
  markers: MarkerLayer,
): () => void {
  const { dataset } = markers.root;
  const show = (): void => {
    const [was, next] = [dataset['state'], state.get() ?? 'unknown'];
    dataset['state'] = next;
    // The first known state is no change: the ring is already pulsing.
    if (was !== next && was !== 'unknown') markers.ring.pulse();
  };
  show();
  return state.subscribe(show);
}

/**
 * Binds the markers to the page: loads the API sites into them, frames
 * the selected one in the free band above the phone sheet, follows the
 * shared selection and its state. `home` is the compass's way back to
 * the opening view.
 */
function bindSites(
  host: HTMLElement,
  options: GlobeOptions,
  globe: Pick<SiteFramerParts, 'orbit' | 'invalidate'> &
    Pick<SelectionParts, 'markers'> & Pick<Stage, 'camera'>,
) {
  const { markers } = globe;
  const { store, reducedMotion, anchors, sheetEdge, markerName } = options;
  const band = new FreeBandWatch();
  const framer = createSiteFramer({ ...globe, band, reducedMotion });
  const get = globalThis.fetch.bind(globalThis);
  const source = { fetch: get, url: options.sitesUrl, warn: options.warn };
  const changes = sheetEdge.subscribe;
  const selection = loadSelection(
    { store, markers, framer, nameOf: markerName }, source);
  const unbind = [
    selection.stop,
    bindSheetEdge(host, { ...globe, band }, sheetEdge),
    watchBand({ host, band, anchors, changes }),
    bindState(options.state, markers),
    framer.dispose,
  ];
  const stop = (): void => unbind.forEach((fn) => fn());
  return { home: selection.home, stop };
}

/**
 * Mounts the globe in `host` and returns its teardown. Throws when the
 * browser has no WebGL; the caller shows the text alternative instead.
 */
export function mountGlobe(host: HTMLElement, options: GlobeOptions) {
  const stage = createStage(host, pickQuality(isPhoneViewport()));
  const orbit = createOrbit(SOUTH_POLE_VIEW);
  const invalidate = (): void => loop.invalidate();
  const contents = addContents(host, options, stage, invalidate);
  const { markers, moon, layers, graticule } = contents;
  const link = linkView(stage, options.onView);
  const parts = { stage, orbit, moon, layers, graticule, ...link, markers };
  const frames = shownFrames((dt) => drawFrame(parts, dt));
  const loop = createLoop(frames.frame);
  const input = bindInput(host, orbit, loop, options.reducedMotion);
  const globeParts = { markers, orbit, invalidate, camera: stage.camera };
  const sites = bindSites(host, options, globeParts);
  const home = sites.home;
  const { onCompass } = options;
  const compass = linkCompass({ stage, frames: link, home, onCompass });
  const sun = bindSun(stage.scene, options.time, invalidate);
  const watch = watchHost(host, stage, loop, frames);
  const devTools = attachDevTools(stage.renderer, moon.textureBytes);
  const unbind = [() => loop.stop(), link.unlink, compass, watch, ...input];
  const end = [sun, layers.dispose, graticule.dispose,
    () => markers.dispose()];
  const teardown = [...unbind, sites.stop, ...end, moon.dispose, devTools];
  return () => [...teardown, () => disposeStage(stage)].forEach((fn) => fn());
}
