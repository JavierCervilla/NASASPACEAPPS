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
 * instant, where the view opens and the words it draws. No Three.js here,
 * so the panel can name them without loading the scene.
 */
import type { HorizonProfile } from '@ventana/sim';
import type { QualitySettings } from '../../lib/quality';
import type { DepthChoice } from '../depth-mode';
import type { LeaveOut } from '../leave-out';
import type { ReportSink } from '../report/sink';
import type { RingView } from '../ring/ring-session';
import type { HeightTile } from '../tile';
import type { Look } from '../view-camera';

/** The near ground and its mesh heights (the frame's y, ring-local.ts). */
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
  /** «180 m»: the walk marker's distance (VENT-121, walk-words.ts). */
  readonly distance?: ((metres: number) => string) | undefined;
}

/** Where the eye stands and what it sees there (VENT-121). */
export interface EyeReport {
  /** Metres east and north of the point. */
  readonly at: readonly [number, number];
  /** It was held to the reach's edge. */
  readonly edge: boolean;
  /** The bodies from there; null at the point (the point's own answer). */
  readonly sight: { readonly sunClear: boolean;
    readonly earthClear: boolean } | null;
}

export interface SceneInput {
  /** The near ground (props, feet, shadows): one around the point. */
  readonly tiles: readonly PlacedTile[];
  /** The relief rings drawn, and the store their tiles arrive in. */
  readonly ring: RingView;
  readonly profile: HorizonProfile | null;
  /** The illustrative detail's seed (seeded.ts). */
  readonly seed: number;
  readonly sky: SkyDirs;
  /** The Earth's scene-to-body matrix, row-major (earth-orientation.ts). */
  readonly earthSpin: readonly number[];
  /** Where the view opens: the Sun's azimuth, or the Earth's. */
  readonly startYawDeg: number;
  readonly words: SceneWords;
}

/**
 * What a mount draws at (VENT-49): its tier, the parts left out, and where
 * it tells the crash report what it does.
 */
export interface SceneSetup {
  readonly quality: QualitySettings;
  /** The `?onfoot=` diagnostic switches (leave-out.ts). */
  readonly leave: ReadonlySet<LeaveOut>;
  /** The `?depth=` and `?shadows=` bisection switches (depth-mode.ts). */
  readonly depth: DepthChoice;
  readonly report: ReportSink;
}

export interface SceneHooks {
  /** Hears the look after each turn, for the text alternative. */
  readonly onLook: (look: Look) => void;
  /**
   * The browser took the GPU context away: the panel frees the scene and
   * says so; it never mounts again by itself.
   */
  readonly onLost: () => void;
  /**
   * A frame while loading cost more than the tier can afford (the frame
   * probe, frame-probe.ts); absent when the tier may not step down.
   */
  readonly onSlowFrame?: (() => void) | undefined;
  /** The first frame is drawn: the loader hands over (VENT-60). */
  readonly onDrawn?: (() => void) | undefined;
  /**
   * The band of the host the view is framed in (the phone's free band
   * between its top bar and sheet), px from the host's top; none: whole.
   */
  readonly band?: (() => { top: number; bottom: number } | null) | undefined;
  /**
   * The eye arrived somewhere, or the sky moved while it stands away
   * (VENT-121): the chip, the edge card and the live region hear it.
   */
  readonly onEye?: ((eye: EyeReport) => void) | undefined;
}

export interface TerrainScene {
  readonly update: (input: SceneInput) => void;
  /**
   * Turns the view back to where it opened, on a spring (instant under
   * reduced motion): the compass's press and Home (VENT-63).
   */
  readonly home: () => void;
  /** Glides the eye back to the point (VENT-121, «Back to …»). */
  readonly back: () => void;
  /** Draws once more (the band moved). */
  readonly invalidate: () => void;
  /**
   * The panel parked the scene while the next point's input loads: its next
   * frame tells `onDrawn` again (VENT-69, one renderer for the view's life).
   */
  readonly rearm: () => void;
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
