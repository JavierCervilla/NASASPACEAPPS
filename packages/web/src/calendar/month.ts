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
 * The UTC month of an instant, as the calendar shows it: its first and
 * last hour, its length, the month before or after, and the day ticks.
 * Pure and deterministic.
 */
import { HOUR_MS } from '@ventana/sim';

const HOURS_PER_DAY = 24;
/** The days the calendar marks, a week apart (validated canvas). */
const TICK_DAYS = [1, 8, 15, 22, 29];

/** The first hour of the UTC month holding `atMs`, Unix ms. */
export function monthStartMs(atMs: number): number {
  const date = new Date(atMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

/** The last hour of the UTC month holding `atMs`, Unix ms. */
export function monthEndMs(atMs: number): number {
  const date = new Date(atMs);
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return next - HOUR_MS;
}

/** How many hours the month of `atMs` has. */
export function monthHours(atMs: number): number {
  return (monthEndMs(atMs) - monthStartMs(atMs)) / HOUR_MS + 1;
}

/**
 * The hour of `atMs` moved `delta` months: the same day and hour, the day
 * held to the last day of a shorter month.
 */
export function shiftMonth(atMs: number, delta: number): number {
  const date = new Date(atMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + delta;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return Date.UTC(year, month, day, date.getUTCHours());
}

/** The day ticks of the month of `atMs`, each at its % across it. */
export function dayTicks(atMs: number): { day: number; pct: number }[] {
  const hours = monthHours(atMs);
  return TICK_DAYS.filter((day) => day <= hours / HOURS_PER_DAY).map(
    (day) => ({ day, pct: (100 * (day - 1) * HOURS_PER_DAY) / hours }),
  );
}
