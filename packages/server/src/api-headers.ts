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

/** Headers every API answer carries, whatever the route or the outcome. */
import type { MiddlewareHandler } from 'hono';

// The API serves JSON and binary terrain tiles: nothing in it may run,
// load or be framed.
const CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";
const HTTP_FIRST_ERROR = 400;

/**
 * Sets nosniff and a restrictive Content-Security-Policy on every answer, and
 * `Cache-Control: no-store` on every error, so a browser or a proxy never
 * keeps a 4xx or 5xx; a successful answer keeps the cache policy its route
 * set.
 */
export function apiHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    if (c.res.status >= HTTP_FIRST_ERROR) {
      c.res.headers.set('Cache-Control', 'no-store');
    }
  };
}
