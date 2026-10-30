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
 * How keys and a pointer move the instant, an hour at a time: the
 * desktop slider runs left to right, the phone's columns top to bottom.
 * Pure, so both inputs agree and are tested without a page.
 */

export type HourAxis = 'horizontal' | 'vertical';

const HOURS_PER_DAY = 24;

const HORIZONTAL: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageUp: HOURS_PER_DAY,
  PageDown: -HOURS_PER_DAY,
};

/** Down is later in the columns, so the keys follow the eye. */
const VERTICAL: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
  PageDown: HOURS_PER_DAY,
  PageUp: -HOURS_PER_DAY,
};

/** Hours `key` moves the instant along `axis`; null for other keys. */
export function hourKeyDelta(key: string, axis: HourAxis): number | null {
  const table = axis === 'horizontal' ? HORIZONTAL : VERTICAL;
  return Object.hasOwn(table, key) ? (table[key] ?? null) : null;
}

/**
 * The hour of the month (0 to `hours` - 1) at `offset` px along a track
 * `size` px long; outside the track, its first or last hour.
 */
export function hourAtOffset(
  offset: number,
  size: number,
  hours: number,
): number {
  const hour = Math.floor((offset / Math.max(size, 1)) * hours);
  return Math.min(hours - 1, Math.max(0, hour));
}
