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
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import { formatAtLeast, formatDuration } from './format';
import { terrainWords } from './terrain-words';
import type { BodyWidget } from './widget-types';

/** The Sun or the Earth, as a widget sees it. */
interface Body {
  readonly id: 'sun' | 'earth';
  /** The widget's label while the body is up, and while it is down. */
  readonly sets: TextKey;
  readonly rises: TextKey;
  readonly up: (sample: HourSample) => boolean;
  readonly elevation: (sample: HourSample) => number;
}

export const SUN: Body = {
  id: 'sun',
  sets: 'body.sunset',
  rises: 'body.sunrise',
  up: hasSun,
  elevation: (sample) => sample.sunEl,
};

export const EARTH: Body = {
  id: 'earth',
  sets: 'body.earthset',
  rises: 'body.earthrise',
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
  i18n: I18n,
): string {
  const left = hoursUntilLost(hours, now.t, keeps);
  const last = hours.at(-1)?.t ?? now.t;
  return left === null
    ? formatAtLeast(i18n, hoursBetween(now.t, last) + 1)
    : formatDuration(i18n, left);
}

/**
 * The Sun's widget where the terrain hides it (VENT-39): no time to wait
 * for and no elevation worth showing, since it never rises there.
 */
function noSunWidget(i18n: I18n): BodyWidget {
  return {
    label: i18n.t('body.sun'),
    value: i18n.t('body.noSun'),
    detail: i18n.t('body.permanentShadow'),
  };
}

/**
 * The widget of `body` for the hour `now` (a sample of `hours`): how long
 * until it sets, or rises when it is down, and its elevation; for the Sun
 * in permanent shadow, that there is none.
 */
export function bodyWidget(
  body: Body,
  hours: readonly HourSample[],
  now: HourSample,
  i18n: I18n,
): BodyWidget {
  if (body.id === 'sun' && now.sunHidden === true) return noSunWidget(i18n);
  const up = body.up(now);
  const keeps = (sample: HourSample): boolean => body.up(sample) === up;
  const value = timeLeft(hours, now, keeps, i18n);
  const label = i18n.t(up ? body.sets : body.rises);
  const { detail, terrain } = terrainWords(body.id, now, i18n);
  return terrain ? { label, value, detail, terrain } : { label, value, detail };
}
