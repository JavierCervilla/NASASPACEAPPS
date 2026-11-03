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
 * The globe's layers (VENT-37): a registry of what draws on the Moon, each
 * layer with an id, a stacking order (`z`), a visible flag and, if it draws
 * on the globe, a renderer. The page owns one registry and passes it to the
 * globe, which mounts every renderer while it runs (bind.ts); the polar map
 * reads the same flags. Visibility outlives a layer: a flag set before its
 * layer registers, or kept from a previous visit, is the one it starts with.
 * Pure: no DOM, no Three.js; the renderers bring their own.
 * The API, with an example: docs/globe-layers.md.
 */
import type { Scene } from 'three';
import type { LatLon } from '../../lib/polar-projection';

/** A point on the globe's canvas, in CSS px from its top left. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** What a renderer gets on each drawn frame while its layer shows. */
export interface LayerFrame {
  /** Where `point` shows on the canvas; null behind the limb. */
  project(point: LatLon): ScreenPoint | null;
}

/**
 * A disc a layer covers on the canvas, px: what the globe's own overlays
 * (the graticule's labels) keep clear of (VENT-52).
 */
export interface LayerCover {
  readonly at: ScreenPoint;
  readonly radius: number;
}

/** What a renderer gets when the globe mounts it. */
export interface LayerContext {
  /**
   * The layer's own element over the canvas, stacked by `z`, hidden while
   * the layer is: DOM markers go in here. It lets clicks through; give
   * your markers `pointer-events: auto`.
   */
  readonly root: HTMLElement;
  /** The globe's Three.js scene, for layers that add 3D objects. */
  readonly scene: Scene;
  /** Asks for a frame (after the layer changed what it draws). */
  readonly invalidate: () => void;
}

/** How a layer draws on the globe; every part is optional. */
export interface LayerRenderer {
  /** The globe is up: create what the layer draws. */
  mount?(context: LayerContext): void;
  /** A frame was drawn and the layer shows: move what it draws. */
  place?(frame: LayerFrame): void;
  /** What the last placed frame drew covers; none if not given. */
  covers?(): readonly LayerCover[];
  /** The layer was shown or hidden (its root already is). */
  show?(visible: boolean): void;
  /** The globe is going: take off what the layer drew. */
  unmount?(): void;
}

/** A layer as it is registered. */
export interface GlobeLayer {
  /** Unique; lowercase words and hyphens: `saved-sites`. */
  readonly id: string;
  /** Higher paints over lower. */
  readonly z: number;
  /** Shown at first unless a flag is kept for `id`; default true. */
  readonly visible?: boolean;
  /** None: a flag only, which views read (the polar map does). */
  readonly renderer?: LayerRenderer;
}

/** A registered layer with its current flag. */
export interface LayerState {
  readonly id: string;
  readonly z: number;
  readonly visible: boolean;
  readonly renderer?: LayerRenderer;
}

export type LayerChange =
  | { readonly kind: 'added' | 'removed'; readonly id: string }
  | { readonly kind: 'visibility'; readonly id: string };

export interface LayerRegistry {
  /** Adds `layer`; returns how to take it away. Throws on a taken id. */
  register(layer: GlobeLayer): () => void;
  /** Takes the layer `id` away; its flag is kept. */
  unregister(id: string): void;
  /** Shows or hides the layer `id`, registered yet or not. */
  setVisible(id: string, visible: boolean): void;
  /** The flag of `id`: kept, or true for one never set. */
  isVisible(id: string): boolean;
  /** The registered layers, lowest `z` first (ties: first registered). */
  list(): readonly LayerState[];
  /** Calls `listener` after every change; returns the unsubscribe. */
  subscribe(listener: (change: LayerChange) => void): () => void;
}

const LAYER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Throws unless `layer` has a well-formed id and a finite `z`. */
function checkLayer(layer: GlobeLayer): void {
  if (!LAYER_ID.test(layer.id)) {
    throw new Error(`Globe layer id «${layer.id}» is not lowercase-hyphenated`);
  }
  if (!Number.isFinite(layer.z)) {
    throw new Error(`Globe layer «${layer.id}» needs a finite z`);
  }
}

interface Entry {
  readonly layer: GlobeLayer;
  readonly order: number;
}

/** `entries` in paint order, with their flags. */
function inOrder(
  entries: Iterable<Entry>,
  visible: (id: string) => boolean,
): LayerState[] {
  return [...entries]
    .sort((a, b) => a.layer.z - b.layer.z || a.order - b.order)
    .map(({ layer: { id, z, renderer } }) => ({
      id,
      z,
      visible: visible(id),
      ...(renderer ? { renderer } : {}),
    }));
}

interface State {
  readonly entries: Map<string, Entry>;
  readonly flags: Map<string, boolean>;
  readonly tell: (change: LayerChange) => void;
  order: number;
}

/** Adds `layer` to `state`; returns how to take this registration away. */
function registerIn(
  state: State,
  layer: GlobeLayer,
  unregister: (id: string) => void,
): () => void {
  checkLayer(layer);
  if (state.entries.has(layer.id)) {
    throw new Error(`Globe layer «${layer.id}» is already registered`);
  }
  if (!state.flags.has(layer.id)) {
    state.flags.set(layer.id, layer.visible ?? true);
  }
  state.order += 1;
  state.entries.set(layer.id, { layer, order: state.order });
  state.tell({ kind: 'added', id: layer.id });
  // Only this registration: a layer registered again under the id stays.
  return () => {
    if (state.entries.get(layer.id)?.layer === layer) unregister(layer.id);
  };
}

/** Who hears the registry's changes, and how to tell them one. */
function changeFeed() {
  const listeners = new Set<(change: LayerChange) => void>();
  const tell = (change: LayerChange): void => {
    for (const listener of [...listeners]) listener(change);
  };
  const subscribe = (listener: (change: LayerChange) => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };
  return { tell, subscribe };
}

/**
 * An empty registry; `kept` holds flags from before (a previous visit),
 * which win over a layer's own default.
 */
export function createLayerRegistry(
  kept: Readonly<Record<string, boolean>> = {},
): LayerRegistry {
  const { tell, subscribe } = changeFeed();
  const flags = new Map(Object.entries(kept));
  const state: State = { entries: new Map(), flags, tell, order: 0 };
  const isVisible = (id: string): boolean => flags.get(id) ?? true;
  const unregister = (id: string): void => {
    if (state.entries.delete(id)) tell({ kind: 'removed', id });
  };
  const setVisible = (id: string, visible: boolean): void => {
    if (flags.get(id) === visible) return;
    flags.set(id, visible);
    tell({ kind: 'visibility', id });
  };
  const register = (layer: GlobeLayer) =>
    registerIn(state, layer, unregister);
  const list = () => inOrder(state.entries.values(), isVisible);
  return { register, unregister, setVisible, isVisible, list, subscribe };
}
