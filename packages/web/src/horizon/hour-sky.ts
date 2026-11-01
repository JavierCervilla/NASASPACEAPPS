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
 * The Sun and the Earth the horizon strip draws (VENT-40): those of the
 * hour the views show at the shared instant, so the strip never disagrees
 * with the tiles beside it; before the hours come, the simulator's at the
 * instant (a site without coordinates waits). Pure.
 */
import {
  HOUR_MS,
  inPermanentShadow,
  skyAt,
  toIso,
  type HourSample,
  type SiteShadow,
} from '@ventana/sim';
import { sampleAt } from '../phone/site-widgets';
import type { HoursResult } from '../phone/widgets-loader';

export type HourSky = Omit<HourSample, 't' | 'dsn'>;

interface Located {
  readonly lat: number;
  readonly lonEast: number;
  readonly shadow?: SiteShadow | undefined;
}

/** The sky of `site` at the hour of `atMs`, from `hours`; null: none. */
export function hourSky(
  site: Located,
  atMs: number | null,
  hours: HoursResult,
): HourSky | null {
  if (atMs === null) return null;
  const hour = toIso(Math.floor(atMs / HOUR_MS) * HOUR_MS);
  const sample = hours.kind === 'ready' ? sampleAt(hours.hours, hour) : null;
  if (sample) return sample;
  const { lat, lonEast } = site;
  if (!Number.isFinite(lat) || !Number.isFinite(lonEast)) return null;
  const sky = skyAt({ latDeg: lat, lonEastDeg: lonEast }, atMs);
  return { ...sky, sunHidden: inPermanentShadow(site.shadow) };
}
