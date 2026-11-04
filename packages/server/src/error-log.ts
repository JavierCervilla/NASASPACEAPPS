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
 * One log line per error answer of the API (VENT-45), so a failure a
 * visitor saw can be found afterwards, and one per answer slower than a
 * bound (VENT-78), so a wait a visitor saw can be too: the method, the
 * path, the status and how long it took. Never the query string (a point
 * is where someone looks), the place of a terrain tile (its x and y), the
 * client's address or the body.
 */
import type { MiddlewareHandler } from 'hono';

const HTTP_FIRST_ERROR = 400;
// The longest path written: a crafted one must not flood the log.
const MAX_PATH = 200;
/** An answer slower than this is logged when the caller sets no bound. */
export const DEFAULT_SLOW_MS = 1000;
// A levelled tile's path ends in its x and y, which say where someone looks.
const TILE_PLACE = /^(\/api\/v1\/terrain\/tiles\/[^/]+\/[^/]+)\/[^/]+\/[^/]+$/;

export interface ErrorLogOptions {
  /** Writes one line. */
  readonly log: (line: string) => void;
  /** Current time in ms. */
  readonly now: () => number;
  /** A success that took longer than this, ms, is logged too. */
  readonly slowMs?: number;
}

/** The path as written: still percent-encoded, a tile's place hidden. */
function loggedPath(url: string): string {
  const path = new URL(url).pathname.slice(0, MAX_PATH);
  return path.replace(TILE_PLACE, '$1/{x}/{y}');
}

/**
 * Logs every answer with a status of 400 or more, and every other answer
 * that took longer than `slowMs`. The path is taken from the URL as sent,
 * still percent-encoded, so it cannot break the line.
 */
export function errorLog(options: ErrorLogOptions): MiddlewareHandler {
  const { log, now, slowMs = DEFAULT_SLOW_MS } = options;
  return async (c, next) => {
    const start = now();
    await next();
    const { status } = c.res;
    const ms = now() - start;
    const kind = status >= HTTP_FIRST_ERROR ? 'error' : ms > slowMs && 'slow';
    if (!kind) return;
    log(`api ${kind}: ${c.req.method} ${loggedPath(c.req.url)} ${status} ${ms} ms`);
  };
}
