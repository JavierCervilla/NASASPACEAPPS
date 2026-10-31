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
 * The «Sunset in» and «Earthset in» widgets. When the body is down they
 * turn into «Sunrise in» and «Earthrise in». The times come from
 * `hoursUntilLost` in `@ventana/sim`, at one-hour resolution.
 */
import {
  hasEarth,
  hasSun,
  hoursBetween,
  hoursUntilLost,
  type HourSample,
} from '@ventana/sim';
import { formatAtLeast, formatDuration, formatElevation } from './format';
import type { BodyWidget } from './widget-types';

/** The Sun or the Earth, as a widget sees it. */
interface Body {
  readonly name: string;
  readonly up: (sample: HourSample) => boolean;
  readonly elevation: (sample: HourSample) => number;
}

export const SUN: Body = {
  name: 'Sun',
  up: hasSun,
  elevation: (sample) => sample.sunEl,
};

export const EARTH: Body = {
  name: 'Earth',
  up: hasEarth,
  elevation: (sample) => sample.earthEl,
};

/**
 * How long `keeps` goes on holding from the hour `now` of `hours`: «7 d
 * 1 h», or «at least 7 d» when it outlasts them.
 */
function timeLeft(
  hours: readonly HourSample[],
  now: HourSample,
  keeps: (sample: HourSample) => boolean,
): string {
  const left = hoursUntilLost(hours, now.t, keeps);
  const last = hours.at(-1)?.t ?? now.t;
  return left === null
    ? formatAtLeast(hoursBetween(now.t, last) + 1)
    : formatDuration(left);
}

/**
 * The widget of `body` for the hour `now` (a sample of `hours`): how long
 * until it sets, or rises when it is down, and its elevation.
 */
export function bodyWidget(
  body: Body,
  hours: readonly HourSample[],
  now: HourSample,
): BodyWidget {
  const up = body.up(now);
  const keeps = (sample: HourSample): boolean => body.up(sample) === up;
  const value = timeLeft(hours, now, keeps);
  const event = up ? 'set' : 'rise';
  const label = `${body.name}${event} in`;
  const detail = formatElevation(body.name, body.elevation(now));
  return { label, value, detail };
}
