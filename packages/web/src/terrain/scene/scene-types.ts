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
 * What the on-foot scene takes (VENT-34): terrain as transferable tiles
 * placed by key in the session's local frame (tile.ts, the seam of the
 * streaming to come), the far horizon's profile, the sky at the shared
 * instant, the camera's mode and the words it draws. No Three.js here, so
 * the panel can name them without loading the scene.
 */
import type { HorizonProfile } from '@ventana/sim';
import type { HeightTile } from '../tile';
import type { CameraMode, Look } from '../view-camera';

/** A tile and its mesh heights (tile-mesh.ts `meshHeights`). */
export interface PlacedTile {
  readonly tile: HeightTile;
  readonly ys: Float32Array;
}

export interface SkyDirs {
  readonly sunAz: number;
  readonly sunEl: number;
  readonly earthAz: number;
  readonly earthEl: number;
}

export interface SceneWords {
  /** The rings' labels, by RING_DISTANCES_M. */
  readonly rings: readonly string[];
  /** The ridge that hides a body, at its azimuth; null: none in reach. */
  readonly ridge: { readonly text: string; readonly azDeg: number;
    readonly distanceM: number } | null;
}

export interface SceneInput {
  /** The tiles the scene draws, by key; one around the point today. */
  readonly tiles: readonly PlacedTile[];
  readonly profile: HorizonProfile | null;
  /** The illustrative detail's seed (seeded.ts). */
  readonly seed: number;
  readonly sky: SkyDirs;
  /** The Earth's scene-to-body matrix, row-major (earth-orientation.ts). */
  readonly earthSpin: readonly number[];
  readonly mode: CameraMode;
  /** Where the view opens: the Sun's azimuth, or the Earth's. */
  readonly startYawDeg: number;
  readonly words: SceneWords;
}

export interface SceneHooks {
  /** Hears the look after each turn, for the text alternative. */
  readonly onLook: (look: Look) => void;
  /**
   * The band of the host the view is framed in (the phone's free band
   * between its top bar and sheet), px from the host's top; none: whole.
   */
  readonly band?: (() => { top: number; bottom: number } | null) | undefined;
}

export interface TerrainScene {
  readonly update: (input: SceneInput) => void;
  /** Draws once more (the band moved). */
  readonly invalidate: () => void;
  readonly dispose: () => void;
}

/** The distance rings, metres (the human's: 25, 100 and 500 m). */
export const RING_DISTANCES_M = [25, 100, 500] as const;

/**
 * Where on its ring each label sits, degrees off the look (to the right is
 * positive): the far two lie near the horizon line, so they take opposite
 * sides, and no label ever stacks on another. Small enough to stay on a
 * phone's narrow field of view.
 */
export const RING_BEARINGS_DEG = [-11, 13, -13] as const;
