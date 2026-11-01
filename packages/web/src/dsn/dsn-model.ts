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
 * What the «Listening on Earth» block knows at an instant (VENT-7): whether
 * the lander can reach the Earth (its elevation against 3°), which complex
 * listens to the Moon and how high it sees it, until when, and who comes
 * next. The complex comes from the simulator, to the minute; the Earth's
 * elevation from the hours the views show (Horizons or computed), so the
 * block never disagrees with the Earth tile beside it. Pure.
 */
import {
  dsnElevations,
  dsnOutlook,
  earthLink,
  type DsnOutlook,
  type DsnSpan,
  type EarthLink,
} from '@ventana/sim';

export interface DsnModel extends DsnOutlook {
  readonly atMs: number;
  /** The link at the site; null when its Earth elevation is unknown. */
  readonly link: EarthLink | null;
  /** The Moon's elevation over the active complex, degrees. */
  readonly moonElDeg: number | null;
  /** The Earth is up but the site's terrain hides it (VENT-40). */
  readonly behindTerrain: boolean;
}

/**
 * The block at `atMs`, from spans covering it and the site's Earth: its
 * elevation, and whether it stands above the site's terrain (VENT-40;
 * undefined when the hour was not read against the terrain).
 */
export function dsnModel(
  spans: readonly DsnSpan[],
  atMs: number,
  earthElDeg: number | null,
  earthAboveTerrain?: boolean,
): DsnModel {
  const outlook = dsnOutlook(spans, atMs);
  const { active } = outlook;
  const moonElDeg = active ? dsnElevations(atMs)[active] : null;
  const link =
    earthElDeg === null ? null : earthLink(earthElDeg, earthAboveTerrain);
  const behindTerrain =
    earthAboveTerrain === false && earthElDeg !== null && earthElDeg > 0;
  return { ...outlook, atMs, link, moonElDeg, behindTerrain };
}
