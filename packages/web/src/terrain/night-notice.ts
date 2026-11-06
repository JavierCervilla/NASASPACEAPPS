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
 * «Lunar night here» over «The Sun rises in 8 d 16 h» (VENT-100): what the
 * 3D view says while the Sun is under the point's horizon. The wait is
 * the «Sunrise in» widget's, counted the same way: the hours the widgets
 * show (Horizons or the simulator's, the site's permanent shadow and
 * terrain applied) from the instant's hour over the widgets' 30 days, and
 * `timeLeft` of the widget («at least 30 d» when the Sun does not rise
 * within them); the simulator's own until those hours hold the instant's.
 * Where NASA's maps put the point in permanent shadow there is no sunrise
 * to wait for, and the site's own note says so: no notice.
 *
 * The notice speaks for the widgets' hour (VENT-106), so it shows when
 * that hour's sample has no Sun, even if the scene, which lights by the
 * Sun it draws at the exact instant, is still by day (use-night.ts).
 */
import {
  computedHours,
  hasSun,
  HOUR_MS,
  shadowedHours,
  terrainHours,
  toIso,
  type HorizonProfile,
  type HourSample,
  type SiteShadow,
} from '@ventana/sim';
import type { I18n } from '../i18n/translate';
import { timeLeft } from '../phone/body-widget';
import { sampleAt, samplesWithin } from '../phone/site-widgets';
import { HORIZON_HOURS } from '../phone/widget-range';

/** The point the view stands on, and what it knows of its horizon. */
export interface NightPlace {
  readonly lat: number;
  readonly lonEast: number;
  readonly profile: HorizonProfile | null;
  readonly shadow?: SiteShadow | undefined;
}

export interface NightNotice {
  readonly title: string;
  readonly rise: string;
}

/** The simulator's hours of the point from `from`, as the views shade them. */
function computedAhead(
  place: NightPlace,
  from: number,
): readonly HourSample[] {
  const point = { latDeg: place.lat, lonEastDeg: place.lonEast };
  const hours = computedHours(point, toIso(from),
    toIso(from + HORIZON_HOURS * HOUR_MS));
  return terrainHours(shadowedHours(hours, place.shadow),
    place.profile ?? undefined);
}

/**
 * The hours from the hour of `atMs` over the widgets' 30 days: `shown`'s
 * when they hold that hour, else the simulator's.
 */
function hoursAhead(
  place: NightPlace,
  atMs: number,
  shown: readonly HourSample[] | null,
): readonly HourSample[] {
  const from = Math.floor(atMs / HOUR_MS) * HOUR_MS;
  const [first, last] = [toIso(from), toIso(from + HORIZON_HOURS * HOUR_MS)];
  const ahead = shown ? samplesWithin(shown, first, last) : [];
  return sampleAt(ahead, first) ? ahead : computedAhead(place, from);
}

/**
 * The notice at the hour of `atMs`, from `shown` (the widgets' hours;
 * null while there are none) or the simulator's; null when that hour has
 * the Sun, or where it never comes.
 */
export function nightNotice(
  place: NightPlace,
  atMs: number,
  shown: readonly HourSample[] | null,
  i18n: I18n,
): NightNotice | null {
  const hours = hoursAhead(place, atMs, shown);
  const now = hours[0];
  if (!now || hasSun(now) || now.sunHidden === true) return null;
  const span = timeLeft(hours, now, (hour) => !hasSun(hour), i18n);
  return {
    title: i18n.t('onFoot.nightTitle'),
    rise: i18n.t('onFoot.nightRise', { span }),
  };
}
