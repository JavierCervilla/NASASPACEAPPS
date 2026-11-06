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
 * The wait before a failed Moon map level is asked again (VENT-99). The
 * globe asks for the level it wants on every frame drawn, so a level that
 * fails fast (a 404, a refused upload) would otherwise be fetched again on
 * each one, its relief downloaded every time. The wait doubles with each
 * failure of the same level, 2 s up to 60 s; a level that lands or a
 * higher one asked for starts afresh. Pure: the time comes in.
 */
import type { LodLevel } from './texture-lod';

export const FIRST_WAIT_MS = 2000;
export const MAX_WAIT_MS = 60_000;

/** The last level that failed and when it may be asked again. */
export interface Backoff {
  readonly level: LodLevel | 0;
  readonly until: number;
  readonly waitMs: number;
}

export const NO_BACKOFF: Backoff = { level: 0, until: 0, waitMs: 0 };

/** The back-off after `level` failed at `now`. */
export function failedAt(
  backoff: Backoff,
  level: LodLevel,
  now: number,
): Backoff {
  const again = backoff.level === level;
  const waitMs = again
    ? Math.min(backoff.waitMs * 2, MAX_WAIT_MS)
    : FIRST_WAIT_MS;
  return { level, until: now + waitMs, waitMs };
}

/** Whether `level` is still waiting at `now` after failing. */
export function heldBack(
  backoff: Backoff,
  level: LodLevel,
  now: number,
): boolean {
  return level === backoff.level && now < backoff.until;
}
