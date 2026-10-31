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
 * Text formats of the phone widgets, in the visitor's language: «7 d 1
 * h», «at least 7 d», «Sun 6.4° up», «47 % of November». Pure.
 */
import { formatPercent } from '../i18n/format';
import type { I18n } from '../i18n/translate';

const HOURS_PER_DAY = 24;

/**
 * A whole number of hours in its largest unit: «7 d» from 173 h, «5 h»
 * under a day; `plus` marks a span that runs on: «30+ d».
 */
export function formatSpan(i18n: I18n, hours: number, plus = false) {
  const days = Math.floor(hours / HOURS_PER_DAY);
  const n = i18n.number(days === 0 ? Math.max(0, hours) : days);
  if (days === 0) return i18n.t(plus ? 'unit.hoursPlus' : 'unit.hours', { n });
  return i18n.t(plus ? 'unit.daysPlus' : 'unit.days', { n });
}

/** «7 d 1 h», «3 d» or «5 h», for a whole number of hours. */
export function formatDuration(i18n: I18n, hours: number): string {
  const whole = Math.max(0, Math.round(hours));
  const days = Math.floor(whole / HOURS_PER_DAY);
  const rest = whole % HOURS_PER_DAY;
  const h = i18n.t('unit.hours', { n: i18n.number(rest) });
  if (days === 0) return h;
  const d = i18n.t('unit.days', { n: i18n.number(days) });
  return rest === 0 ? d : i18n.t('duration.pair', { days: d, hours: h });
}

/**
 * At least this long, when the range ends first: «at least 7 d». Under a
 * day it keeps the hours: «at least 5 h».
 */
export function formatAtLeast(i18n: I18n, hours: number): string {
  return i18n.t('duration.atLeast', { span: formatSpan(i18n, hours) });
}

/** «Sun 6.4° up» or «Earth 2.0° below». */
export function formatElevation(
  i18n: I18n,
  body: 'sun' | 'earth',
  elevationDeg: number,
): string {
  const deg = `${i18n.number(Math.abs(elevationDeg), 1)}°`;
  const below = elevationDeg < 0;
  if (body === 'sun') {
    return i18n.t(below ? 'elevation.sunDown' : 'elevation.sunUp', { deg });
  }
  return i18n.t(below ? 'elevation.earthDown' : 'elevation.earthUp', { deg });
}

/** «47 % of November». */
export function formatShare(i18n: I18n, percent: number, month: string) {
  const pct = formatPercent(i18n, percent);
  return i18n.t('share.month', { pct, month });
}
