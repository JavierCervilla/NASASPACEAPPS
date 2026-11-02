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
 * The state at one instant of any point, from the simulator's sky
 * (`skyAt`): what the pin's readout and dot show while it is
 * carried, every move, without a month of hours, and what a saved site's
 * row shows. Over a terrain profile when one is given (VENT-44), read as
 * the views read their hours (`terrainHours`). Pure.
 */
import {
  isAboveTerrain,
  skyAt,
  type HorizonProfile,
  type Sky,
} from '@ventana/sim';
import type { LatLon } from '../lib/polar-projection';
import { nowState } from '../phone/now-widget';
import type { NowState } from '../phone/widget-types';

/** A point's terrain profile when the page has one; never fetched. */
export type CachedTerrain = (point: LatLon) => HorizonProfile | undefined;

/**
 * Sun and Earth over `point` at `ms`: window, one of them, or none; over
 * `profile`'s horizon when there is one, else the smooth sphere's.
 */
export function stateAtPoint(
  point: LatLon,
  ms: number,
  profile?: HorizonProfile,
): NowState {
  const sky = skyAt({ latDeg: point.lat, lonEastDeg: point.lonEast }, ms);
  if (!profile) return nowState(sky);
  const seen: Sky = {
    ...sky,
    sunAboveTerrain: isAboveTerrain(profile, sky.sunAz, sky.sunEl),
    earthAboveTerrain: isAboveTerrain(profile, sky.earthAz, sky.earthEl),
  };
  return nowState(seen);
}

/**
 * A point's state at the instant `atMs` reads, over the profile `cached`
 * keeps for it (the smooth sphere without one).
 */
export function terrainStateAt(cached: CachedTerrain, atMs: () => number) {
  return (point: LatLon): NowState =>
    stateAtPoint(point, atMs(), cached(point));
}
