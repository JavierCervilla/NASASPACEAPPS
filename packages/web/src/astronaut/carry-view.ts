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
 * What the carried astronaut shows (VENT-10): where its feet are, its
 * lean, and the readout under them, the Moon's point (on the server's
 * grid) and its state at the shared instant, or off the Moon.
 */
import type { LatLon } from '../lib/polar-projection';
import type { NowState } from '../phone/widget-types';
import { snapPoint } from './custom-point';
import type { ClientPoint, Surfaces } from './surfaces';

export interface CarryView {
  /** Carried by a pointer, or moved by the arrow keys. */
  readonly mode: 'pointer' | 'keys';
  /** Carried, or walking home. */
  readonly phase: 'carry' | 'return';
  readonly feet: ClientPoint;
  /** Degrees, leaning with the hand's speed. */
  readonly lean: number;
  /** The point under the feet; null off the Moon. */
  readonly point: LatLon | null;
  /** That point's state now; null off the Moon. */
  readonly state: NowState | null;
}

export interface ReadoutDeps {
  readonly surfaces: Surfaces;
  /** A point's state at the shared instant (sky-state.ts). */
  readonly stateAt: (point: LatLon) => NowState;
}

/** The view with its feet at `feet` and the readout there. */
export function viewAt(
  deps: ReadoutDeps,
  base: Pick<CarryView, 'mode' | 'phase' | 'lean'>,
  feet: ClientPoint,
): CarryView {
  const under = base.phase === 'carry' ? deps.surfaces.at(feet) : null;
  const point = under?.point ? snapPoint(under.point) : null;
  const state = point ? deps.stateAt(point) : null;
  return { ...base, feet, point, state };
}
