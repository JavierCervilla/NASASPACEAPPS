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
 * How the DSN views write a time: on the minute, in UTC like the rest of
 * the app, and how long is left: «~6 h» from an hour on, the minutes
 * under it. Intl writes the numbers. Pure.
 */
import type { I18n } from '../i18n/translate';

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;

/** «02:16»: the UTC hour and minute of `ms`, 24-hour clock. */
export function clockText(i18n: I18n, ms: number): string {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  } as const;
  return new Intl.DateTimeFormat(i18n.tag, options).format(ms);
}

/** «~6 h left», «16 min left»: what is left of `ms`. */
export function leftText(i18n: I18n, ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < MINUTES_PER_HOUR) {
    return i18n.plural('dsn.leftMinutes', minutes);
  }
  return i18n.plural('dsn.leftHours', Math.round(minutes / MINUTES_PER_HOUR));
}

/** «52°»: an elevation to the whole degree. */
export function degText(i18n: I18n, deg: number): string {
  return `${i18n.number(Math.round(deg))}°`;
}
