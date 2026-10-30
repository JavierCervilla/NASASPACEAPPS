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

/** How the calendar writes an instant and a month, in UTC. Pure. */
import { MONTHS } from '../phone/widget-range';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const twoDigits = (n: number): string => String(n).padStart(2, '0');

/** «18:00»: the hour of `atMs`, on the hour (the data is hourly). */
function hourText(date: Date): string {
  return `${twoDigits(date.getUTCHours())}:00`;
}

/** «Mon 23 Nov · 18:00 UTC». */
export function formatInstant(atMs: number): string {
  const date = new Date(atMs);
  const weekday = WEEKDAYS[date.getUTCDay()] ?? '';
  const month = (MONTHS[date.getUTCMonth()] ?? '').slice(0, 3);
  const day = `${weekday} ${date.getUTCDate()} ${month}`;
  return `${day} · ${hourText(date)} UTC`;
}

/** «23 · 18:00»: the chip on the phone's instant line. */
export function formatChip(atMs: number): string {
  const date = new Date(atMs);
  return `${date.getUTCDate()} · ${hourText(date)}`;
}

/** «November 2026». */
export function monthLabel(atMs: number): string {
  const date = new Date(atMs);
  return `${MONTHS[date.getUTCMonth()] ?? ''} ${date.getUTCFullYear()}`;
}
