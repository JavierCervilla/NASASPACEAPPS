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
 * Mounts the on-foot scene (VENT-34) in a host once its input exists:
 * the scene's code is a dynamic import, so it downloads only when the view
 * opens; later inputs update it, the band's moves draw it again, and
 * leaving the view frees it.
 */
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type {
  SceneHooks,
  SceneInput,
  TerrainScene,
} from '../../terrain/scene/scene-types';

export type SceneStatus = 'loading' | 'ready' | 'failed';

/** Subscribes to the moves of the view's band; returns the unsubscribe. */
export type BandMoves = (listener: () => void) => () => void;

type Hooks = SceneHooks & { readonly bandMoves?: BandMoves | undefined };

interface Mount {
  readonly el: HTMLElement;
  readonly latest: RefObject<SceneInput | null>;
  readonly hooks: RefObject<Hooks>;
  readonly scene: RefObject<TerrainScene | null>;
  readonly onStatus: (status: SceneStatus) => void;
}

/** Loads and mounts the scene; returns what undoes it. */
function mountScene(m: Mount): () => void {
  let live = true;
  let off: (() => void) | undefined;
  void import('../../terrain/scene/terrain-scene').then((module) => {
    const input = m.latest.current;
    if (!live || !input) return;
    m.scene.current = module.mountTerrainScene(m.el, input, {
      onLook: (look) => m.hooks.current.onLook(look),
      band: () => m.hooks.current.band?.() ?? null,
    });
    off = m.hooks.current.bandMoves?.(() => m.scene.current?.invalidate());
    m.onStatus('ready');
  }).catch((error: unknown) => {
    console.warn(`Ventana Lunar: the 3D view could not start (${String(error)}).`);
    if (live) m.onStatus('failed');
  });
  return () => {
    live = false;
    off?.();
    m.scene.current?.dispose();
    m.scene.current = null;
  };
}

/** The scene in `host` for `input` (null: not yet); its status. */
export function useTerrainScene(
  host: RefObject<HTMLDivElement | null>,
  input: SceneInput | null,
  hooks: Hooks,
): SceneStatus {
  const scene = useRef<TerrainScene | null>(null);
  const latest = useRef(input);
  latest.current = input;
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;
  const [status, setStatus] = useState<SceneStatus>('loading');
  const ready = input !== null;
  useEffect(() => {
    const el = host.current;
    if (!ready || !el) return undefined;
    const m = { el, latest, hooks: hooksRef, scene, onStatus: setStatus };
    return mountScene(m);
  }, [host, ready]);
  useEffect(() => {
    if (input) scene.current?.update(input);
  }, [input]);
  return status;
}
