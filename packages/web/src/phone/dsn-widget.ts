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
 * The «Listening on Earth» widget: the DSN complex that tracks the Moon
 * this hour and how long it keeps it, or when the next one picks it up.
 */
import {
  hoursBetween,
  hoursUntilLost,
  toMs,
  type DsnComplex,
  type HourSample,
} from '@ventana/sim';
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import { formatAtLeast, formatDuration } from './format';
import type { DsnWidget } from './widget-types';

/**
 * The antenna site's name, which is never translated, and where it is,
 * as the canvas shows them.
 */
const COMPLEXES: Readonly<Record<DsnComplex, [string, TextKey]>> = {
  goldstone: ['Goldstone', 'dsn.california'],
  canberra: ['Canberra', 'dsn.australia'],
  madrid: ['Robledo', 'dsn.madrid'],
};

const HOURS_PER_DAY = 24;

/** The whole hours from `now` to the end of `hours`, the last included. */
const hoursToEnd = (hours: readonly HourSample[], now: HourSample) =>
  hoursBetween(now.t, hours.at(-1)?.t ?? now.t) + 1;

/**
 * The count the «left» verb agrees with («queda 1 h», «quedan 5 h»): the
 * leading number of a span in one unit (`single`, «at least 7 d»), or of
 * a duration, where two parts («1 d 1 h») agree as many.
 */
const agreeCount = (hours: number, single: boolean): number => {
  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days === 0) return hours;
  return single || hours % HOURS_PER_DAY === 0 ? days : hours;
};

function listening(
  hours: readonly HourSample[],
  now: HourSample,
  dsn: DsnComplex,
  i18n: I18n,
): DsnWidget {
  const [name, place] = COMPLEXES[dsn];
  const left = hoursUntilLost(hours, now.t, (s) => s.dsn === dsn);
  const time =
    left === null
      ? formatAtLeast(i18n, hoursToEnd(hours, now))
      : i18n.t('duration.about', { span: formatDuration(i18n, left) });
  const count = agreeCount(left ?? hoursToEnd(hours, now), left === null);
  const detail = i18n.plural('dsn.left', count, { place: i18n.t(place), time });
  return { value: name, detail };
}

function waiting(
  hours: readonly HourSample[],
  now: HourSample,
  i18n: I18n,
): DsnWidget {
  const value = i18n.t('dsn.none');
  const nowMs = toMs(now.t);
  const next = hours.find((s) => s.dsn !== null && toMs(s.t) > nowMs);
  if (!next?.dsn) {
    const span = formatAtLeast(i18n, hoursToEnd(hours, now));
    return { value, detail: i18n.t('dsn.noneFor', { span }) };
  }
  const [name] = COMPLEXES[next.dsn];
  const span = formatDuration(i18n, hoursBetween(now.t, next.t));
  const wait = i18n.t('duration.about', { span });
  return { value, detail: i18n.t('dsn.next', { name, wait }) };
}

/** The widget for the hour `now`, a sample of `hours`. */
export function dsnWidget(
  hours: readonly HourSample[],
  now: HourSample,
  i18n: I18n,
): DsnWidget {
  return now.dsn
    ? listening(hours, now, now.dsn, i18n)
    : waiting(hours, now, i18n);
}
