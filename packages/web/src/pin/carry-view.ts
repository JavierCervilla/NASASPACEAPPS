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
 * What the carried pin shows (VENT-10, VENT-37): where its centre is, and
 * the readout there, the Moon's point (on the server's grid) and its
 * state at the shared instant, or off the Moon.
 */
import type { LatLon } from '../lib/polar-projection';
import type { WatchedValue } from '../lib/watched-value';
import type { NowState } from '../phone/widget-types';
import { snapPoint } from './custom-point';
import type { ClientPoint, Surfaces } from './surfaces';

export interface CarryView {
  /**
   * Carried by a pointer, moved by the arrow keys, or lifted by a finger
   * held on the Moon (where the phone sheet stays put).
   */
  readonly mode: 'pointer' | 'keys' | 'hold';
  /** Carried, or springing back to where it was lifted. */
  readonly phase: 'carry' | 'return';
  /** The pin's centre, client px: the point it names. */
  readonly at: ClientPoint;
  /** The point under the centre; null off the Moon. */
  readonly point: LatLon | null;
  /** That point's state now; null off the Moon. */
  readonly state: NowState | null;
}

export interface ReadoutDeps {
  readonly surfaces: Surfaces;
  /** A point's state at the shared instant (sky-state.ts). */
  readonly stateAt: (point: LatLon) => NowState;
}

/** The view with the pin's centre at `at` and the readout there. */
export function viewAt(
  deps: ReadoutDeps,
  base: Pick<CarryView, 'mode' | 'phase'>,
  at: ClientPoint,
): CarryView {
  const under = base.phase === 'carry' ? deps.surfaces.at(at) : null;
  const point = under?.point ? snapPoint(under.point) : null;
  const state = point ? deps.stateAt(point) : null;
  return { ...base, at, point, state };
}

/**
 * Reads again what is under the carried pin: the Moon moved under it
 * (the globe zoomed, turned or was re-framed), not the pointer. Only a
 * new point or state is set, so a turning globe redraws nothing else.
 */
export function repick(
  deps: ReadoutDeps,
  view: WatchedValue<CarryView | null>,
): void {
  const now = view.get();
  if (now?.phase !== 'carry') return;
  const next = viewAt(deps, now, now.at);
  const same = next.point?.lat === now.point?.lat
    && next.point?.lonEast === now.point?.lonEast
    && next.state === now.state;
  if (!same) view.set(next);
}
