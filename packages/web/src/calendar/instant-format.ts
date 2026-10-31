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
 * How the calendar writes an instant and a month, in UTC and in the
 * visitor's language: Intl names the weekday and the month. Pure.
 */
import { monthYear } from '../i18n/format';
import type { I18n } from '../i18n/translate';

const twoDigits = (n: number): string => String(n).padStart(2, '0');

/** «18:00»: the hour of `atMs`, on the hour (the data is hourly). */
function hourText(date: Date): string {
  return `${twoDigits(date.getUTCHours())}:00`;
}

/** «Mon 23 Nov · 18:00 UTC». */
export function formatInstant(i18n: I18n, atMs: number): string {
  const options = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  } as const;
  const day = new Intl.DateTimeFormat(i18n.tag, options).format(atMs);
  const hour = hourText(new Date(atMs));
  return i18n.t('instant.utc', { day, hour });
}

/** «23 · 18:00»: the chip on the phone's instant line. */
export function formatChip(atMs: number): string {
  const date = new Date(atMs);
  return `${date.getUTCDate()} · ${hourText(date)}`;
}

/** «November 2026», as a heading. */
export function monthLabel(i18n: I18n, atMs: number): string {
  return monthYear(i18n, atMs, true);
}
