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
 * Mounts a layer registry (registry.ts) on the running globe (VENT-37):
 * from the first drawn frame, each registered layer gets its own element
 * over the canvas, in `z` order, hidden while the layer is, and its
 * renderer is mounted there; layers registered or taken away later
 * follow. On each drawn frame the shown layers' renderers place what they
 * draw. Every root is its own stacking context at z-index 0 (saved.css
 * `.globe-layer`), so the
 * floating surfaces after the canvas (the Layers key) still paint over
 * the markers and take their clicks.
 */
import type { Scene } from 'three';
import { isFacing, latLonToVector, type Vec3 } from '../geo';
import type { Projector } from '../marker-layer';
import type {
  LayerFrame,
  LayerRegistry,
  LayerRenderer,
  LayerState,
} from './registry';

export interface LayerHost {
  readonly host: HTMLElement;
  readonly scene: Scene;
  readonly invalidate: () => void;
}

interface Mounted {
  readonly root: HTMLElement;
  readonly renderer: LayerRenderer | undefined;
  visible: boolean;
}

/** A layer's root, mounted with its renderer, showing as its flag says. */
function mountLayer(state: LayerState, deps: LayerHost): Mounted {
  const root = document.createElement('div');
  root.className = 'globe-layer';
  root.dataset['layer'] = state.id;
  root.hidden = !state.visible;
  deps.host.append(root);
  const { scene, invalidate } = deps;
  state.renderer?.mount?.({ root, scene, invalidate });
  state.renderer?.show?.(state.visible);
  return { root, renderer: state.renderer, visible: state.visible };
}

function unmountLayer(mounted: Mounted): void {
  mounted.renderer?.unmount?.();
  mounted.root.remove();
}

/**
 * Brings `mounted` in line with the registry: new layers mounted, gone
 * ones unmounted, flags applied; with `reorder` the roots are put back in
 * `z` order (only then: moving a root would blur a focused marker).
 */
function sync(
  registry: LayerRegistry,
  mounted: Map<string, Mounted>,
  deps: LayerHost,
  reorder: boolean,
): void {
  const states = registry.list();
  for (const [id, layer] of mounted) {
    if (states.some((state) => state.id === id)) continue;
    unmountLayer(layer);
    mounted.delete(id);
  }
  for (const state of states) {
    const layer = mounted.get(state.id) ?? mountLayer(state, deps);
    mounted.set(state.id, layer);
    if (reorder) deps.host.append(layer.root);
    if (layer.visible === state.visible) continue;
    layer.visible = state.visible;
    layer.root.hidden = !state.visible;
    layer.renderer?.show?.(state.visible);
  }
  deps.invalidate();
}

/** What renderers see of a frame: points through `project` from `eye`. */
function frameOf(project: Projector, eye: Vec3): LayerFrame {
  const projectPoint: LayerFrame['project'] = (point) => {
    const at = latLonToVector(point.lat, point.lonEast);
    return isFacing(at, eye) ? project(at) : null;
  };
  return { project: projectPoint };
}

/**
 * Mounts `registry`'s layers on the globe in `deps.host`; returns how to
 * place them each frame and how to take them all off.
 */
export function bindLayers(registry: LayerRegistry, deps: LayerHost) {
  const mounted = new Map<string, Mounted>();
  // Mounting waits for the first frame: the globe is whole by then.
  let started = false;
  const stop = registry.subscribe((change) => {
    if (started) sync(registry, mounted, deps, change.kind !== 'visibility');
  });
  const place = (project: Projector, eye: Vec3): void => {
    if (!started) {
      started = true;
      sync(registry, mounted, deps, true);
    }
    const frame = frameOf(project, eye);
    for (const layer of mounted.values()) {
      if (layer.visible) layer.renderer?.place?.(frame);
    }
  };
  const dispose = (): void => {
    stop();
    for (const layer of mounted.values()) unmountLayer(layer);
    mounted.clear();
  };
  return { place, dispose };
}
