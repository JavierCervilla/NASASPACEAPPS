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
 * Numbers, angles and months in the visitor's language: «47 %», «84,79°
 * S», «noviembre de 2026». Intl writes the numbers and the months; the
 * catalogue the units and the compass letters. Pure.
 */
import type { I18n } from './translate';

/** «47 %», rounded to a whole percent. */
export function formatPercent(i18n: I18n, percent: number): string {
  return i18n.t('percent', { n: i18n.number(Math.round(percent)) });
}

/**
 * «84.79° S»: a latitude (`lat`) or a longitude east (`lon`, past 180
 * read as west), with `digits` decimals and its compass letter.
 */
export function formatAngle(
  i18n: I18n,
  deg: number,
  axis: 'lat' | 'lon',
  digits = 2,
): string {
  const value = axis === 'lon' && deg > 180 ? deg - 360 : deg;
  const [plus, minus] =
    axis === 'lat' ? (['compass.n', 'compass.s'] as const)
      : (['compass.e', 'compass.w'] as const);
  const letter = i18n.t(value < 0 ? minus : plus);
  return `${i18n.number(Math.abs(value), digits)}° ${letter}`;
}

/** «84.79° S, 29.20° E». */
export function formatCoords(i18n: I18n, lat: number, lonEast: number) {
  const pair = {
    lat: formatAngle(i18n, lat, 'lat'),
    lon: formatAngle(i18n, lonEast, 'lon'),
  };
  return i18n.t('coords.pair', pair);
}

/** The UTC month of `atMs` in running text: «November», «noviembre». */
export function monthName(i18n: I18n, atMs: number): string {
  const options = { month: 'long', timeZone: 'UTC' } as const;
  return new Intl.DateTimeFormat(i18n.tag, options).format(atMs);
}

/**
 * The UTC month and year of `atMs`: «noviembre de 2026» in running text,
 * «Noviembre de 2026» as a `heading`.
 */
export function monthYear(i18n: I18n, atMs: number, heading = false) {
  const options = { month: 'long', year: 'numeric', timeZone: 'UTC' } as const;
  const text = new Intl.DateTimeFormat(i18n.tag, options).format(atMs);
  if (!heading) return text;
  return text.charAt(0).toLocaleUpperCase(i18n.tag) + text.slice(1);
}
