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
 * The places the astronaut can be dropped on: the globe and the polar
 * map, each registered while it is on the page (VENT-10). A drop point
 * belongs to the surface whose element is the one under it, so a panel
 * floating over the Moon (the Layers key, the phone sheet) is not the
 * Moon. Each surface answers the Moon's point under a client px, and
 * where a point of the Moon shows, and they tell together when their
 * points move, so a carry reads again what is under a still crosshair.
 */
import type { LatLon } from '../lib/polar-projection';
import { createSurfaceMoves } from './surface-moves';

export interface ClientPoint {
  readonly x: number;
  readonly y: number;
}

export interface DropSurface {
  /** The element the surface draws in. */
  readonly host: HTMLElement;
  pointAt(clientX: number, clientY: number): LatLon | null;
  /** Where `point` shows, client px; null when it does not. */
  place(point: LatLon): ClientPoint | null;
  /** Hears that its points moved (the globe turned); optional. */
  subscribe?(listener: () => void): () => void;
}

export interface Surfaces {
  /** Adds `surface`; returns how to take it away. */
  add(surface: DropSurface): () => void;
  /** The surface under client px `at`, and the Moon's point there. */
  at(at: ClientPoint): { surface: DropSurface; point: LatLon | null } | null;
  /** The surface on screen, for the keyboard; null when none is. */
  shown(): DropSurface | null;
  /** Hears that any surface's points moved; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** The element at client px, as the page hit-tests it. */
export type HitTest = (at: ClientPoint) => Element | null;

const isShown = (surface: DropSurface): boolean =>
  surface.host.isConnected && surface.host.closest('[hidden]') === null;

export function createSurfaces(hitTest: HitTest): Surfaces {
  const list = new Set<DropSurface>();
  const moves = createSurfaceMoves(list);
  return {
    add: (surface) => {
      list.add(surface);
      const untrack = moves.track(surface);
      return () => {
        list.delete(surface);
        untrack();
      };
    },
    at: (at) => {
      const hit = hitTest(at);
      if (!hit) return null;
      const surface = [...list].find((s) => s.host.contains(hit));
      if (!surface || !isShown(surface)) return null;
      return { surface, point: surface.pointAt(at.x, at.y) };
    },
    shown: () => [...list].find(isShown) ?? null,
    subscribe: moves.subscribe,
  };
}
