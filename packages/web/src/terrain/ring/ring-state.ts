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
 * What a view knows of its ring (VENT-46): loading, ready with the ring it
 * draws, or one of the horizon's final failures (VENT-45).
 */
import { NoTerrainHereError, TerrainNotInstalledError } from
  '../../horizon/horizon-errors';
import type { LatLon } from '../../lib/polar-projection';
import type { PlacedTile } from '../scene/scene-types';
import type { Frame } from './ring-frame';
import type { RingTier } from './ring-plan';
import type { RingSource } from './ring-source';
import type { ProgressStore } from './progress-store';
import type { RingStore } from './ring-store';
import type { Window } from './ring-window';

/** What a view knows of its ring. */
export type RingState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly ring: RingView }
  | { readonly kind: 'noTerrain' }
  | { readonly kind: 'notInstalled' }
  | { readonly kind: 'unavailable' };

/** The ring a view draws: what the scene needs beyond the near ground. */
export interface RingView {
  readonly store: RingStore;
  readonly frame: Frame;
  readonly windows: readonly Window[];
  readonly tier: RingTier;
  readonly near: PlacedTile;
  /** The finest LOLA grid that served any node, metres. */
  readonly resolutionM: number;
}

export interface RingRun {
  readonly source: RingSource;
  readonly point: LatLon;
  readonly tier: RingTier;
  readonly signal: AbortSignal;
  /** Lets the page breathe between slices of work. */
  readonly breathe: () => Promise<void>;
  /** Tells the crash report how the ring is coming (VENT-49). */
  readonly note?: ((text: string) => void) | undefined;
  /** Hears how the tiles come, for the loader (VENT-60). */
  readonly progress?: ProgressStore | undefined;
}

/** What a final `error` leaves the view. */
export function settledState(error: unknown): RingState {
  if (error instanceof NoTerrainHereError) return { kind: 'noTerrain' };
  if (error instanceof TerrainNotInstalledError) {
    return { kind: 'notInstalled' };
  }
  return { kind: 'unavailable' };
}

