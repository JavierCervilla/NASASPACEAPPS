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
 * Starts the globe: imports `./globe` (Three.js inside) and mounts it. When
 * the browser asks to save data, nothing is downloaded until the visitor
 * asks for the globe (`load`).
 */
import { loadChunk } from '../pwa/missing-chunk';
import type { GlobeOptions } from './globe';

/** How the start went: drawing, no WebGL, or waiting to be asked. */
export type GlobeStatus =
  | { readonly kind: 'ready' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'deferred' };

/** A started (or waiting) globe. */
export interface GlobeStart {
  /** Downloads and mounts the globe, once. */
  readonly load: () => void;
  readonly dispose: () => void;
}

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
    const { mountGlobe } = await loadChunk(() => import('./globe'), window);
    const dispose = cancelled() ? null : mountGlobe(host, options);
    return { dispose, status: { kind: 'ready' } };
  } catch (error) {
    options.warn(`Ventana Lunar: the 3D globe could not start (${String(error)}).`);
    return { dispose: null, status: { kind: 'unavailable' } };
  }
}

interface StartState {
  started: boolean;
  cancelled: boolean;
  dispose: () => void;
}

/** The function that downloads and mounts the globe, at most once. */
function loader(
  host: HTMLElement,
  options: GlobeOptions,
  onStatus: (status: GlobeStatus) => void,
  state: StartState,
): () => void {
  return () => {
    if (state.started || state.cancelled) return;
    state.started = true;
    void mount(host, options, () => state.cancelled).then((outcome) => {
      state.dispose = outcome.dispose ?? NOTHING;
      if (state.cancelled) state.dispose();
      else onStatus(outcome.status);
    });
  };
}

/**
 * Mounts the globe in `host` at once, or with `saveData` only once `load`
 * is called (reporting `deferred` meanwhile), and reports the outcome.
 */
export function startGlobe(
  host: HTMLElement,
  options: GlobeOptions,
  onStatus: (status: GlobeStatus) => void,
  saveData: boolean,
): GlobeStart {
  const state = { started: false, cancelled: false, dispose: NOTHING };
  const load = loader(host, options, onStatus, state);
  if (saveData) onStatus({ kind: 'deferred' });
  else load();
  return {
    load,
    dispose: () => {
      state.cancelled = true;
      state.dispose();
    },
  };
}
