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

/** The client IP the cache-miss limit is keyed on. */
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

/**
 * The client IP the miss limit is keyed on. In production the API sits behind
 * Traefik, which appends the address it received the connection from to
 * X-Forwarded-For, so the right-most entry is the one a client cannot forge
 * (anything to its left is whatever the client sent). Without the header (a
 * direct connection, local runs) it is the socket address; `getConnInfo`
 * throws when the app runs outside the Node server (as in tests), and then
 * every caller shares the key 'unknown'. If another proxy is ever put in front
 * of Traefik, this key becomes that proxy's address.
 */
export function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  const last = forwarded?.split(',').at(-1)?.trim();
  if (last) return last;
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
