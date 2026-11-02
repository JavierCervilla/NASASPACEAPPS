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
 * visitor saw can be found afterwards: the method, the path, the status
 * and how long it took. Never the query string (a point is where someone
 * looks), the client's address or the body.
 */
import type { MiddlewareHandler } from 'hono';

const HTTP_FIRST_ERROR = 400;
// The longest path written: a crafted one must not flood the log.
const MAX_PATH = 200;

export interface ErrorLogOptions {
  /** Writes one line. */
  readonly log: (line: string) => void;
  /** Current time in ms. */
  readonly now: () => number;
}

/**
 * Logs every answer with a status of 400 or more. The path is taken from
 * the URL as sent, still percent-encoded, so it cannot break the line.
 */
export function errorLog({ log, now }: ErrorLogOptions): MiddlewareHandler {
  return async (c, next) => {
    const start = now();
    await next();
    const { status } = c.res;
    if (status < HTTP_FIRST_ERROR) return;
    const path = new URL(c.req.url).pathname.slice(0, MAX_PATH);
    log(`api error: ${c.req.method} ${path} ${status} ${now() - start} ms`);
  };
}
