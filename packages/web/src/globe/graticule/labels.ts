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
 * What the graticule's labels name and where each may stand (VENT-50): a
 * meridian is named at one point of its own line, just outside the
 * outermost parallel, a parallel at any of the meridians' candidate
 * longitudes, which place.ts chooses among each frame. Pure.
 */
import { MERIDIANS_EAST_DEG } from './lines';

export interface GraticuleLabel {
  /** Unique: `parallel:-85`, `meridian:45`. */
  readonly id: string;
  readonly kind: 'parallel' | 'meridian';
  /** The latitude the label stands at (the line's own for a parallel). */
  readonly lat: number;
  /**
   * The east longitudes it may stand at: a meridian's own, for a meridian;
   * for a parallel, every `PARALLEL_STEP_DEG` round the Moon.
   */
  readonly lonEasts: readonly number[];
}

/** A meridian is named just outside the outermost parallel. */
export const MERIDIAN_LABEL_LAT = -60;

/** Degrees between the longitudes a parallel's label may stand at. */
export const PARALLEL_STEP_DEG = 15;

/**
 * The parallels in the order labels are kept when two would overlap: the
 * 85° and the 70° first, since the 80° is the one a close pair loses.
 */
const PARALLELS_NAMED = [-85, -70, -80] as const;

/** The longitudes round the Moon at `PARALLEL_STEP_DEG`, from 180° W. */
function aroundTheMoon(): number[] {
  const count = 360 / PARALLEL_STEP_DEG;
  return Array.from({ length: count }, (_, i) => i * PARALLEL_STEP_DEG - 180);
}

/** Every label, in the order they are placed: meridians, then parallels. */
export function graticuleLabels(): GraticuleLabel[] {
  const meridians = MERIDIANS_EAST_DEG.map<GraticuleLabel>((lonEast) => ({
    id: `meridian:${lonEast}`,
    kind: 'meridian',
    lat: MERIDIAN_LABEL_LAT,
    lonEasts: [lonEast],
  }));
  const parallels = PARALLELS_NAMED.map<GraticuleLabel>((lat) => ({
    id: `parallel:${lat}`,
    kind: 'parallel',
    lat,
    lonEasts: aroundTheMoon(),
  }));
  return [...meridians, ...parallels];
}
