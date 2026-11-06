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
 * The site list's answer (VENT-96). The list is read once at start and
 * changes only with a deploy, so a browser may keep it a few minutes and then
 * revalidate it against an ETag of its content, which a deploy that changes
 * the list changes too.
 */
import { createHash } from 'node:crypto';
import type { Site } from '@ventana/sim';
import type { Context } from 'hono';

const SITES_CACHE_CONTROL = 'public, max-age=300';
const HTTP_NOT_MODIFIED = 304;
const TAG_HEX = 16;

/** A strong ETag of `body`, the first 64 bits of its sha256. */
function contentTag(body: string): string {
  const hex = createHash('sha256').update(body).digest('hex');
  return `"${hex.slice(0, TAG_HEX)}"`;
}

// compress() weakens the ETag of a gzipped answer, so W/ is read as the tag.
function matches(header: string | undefined, tag: string): boolean {
  const tags = (header ?? '').split(',');
  return tags.some((t) => t.trim().replace(/^W\//, '') === tag);
}

/** The GET /sites handler for `sites`, its body and ETag worked out once. */
export function sitesHandler(sites: readonly Site[]) {
  const body = JSON.stringify({ sites });
  const tag = contentTag(body);
  return (c: Context): Response => {
    c.header('ETag', tag);
    c.header('Cache-Control', SITES_CACHE_CONTROL);
    if (matches(c.req.header('If-None-Match'), tag)) {
      return c.body(null, HTTP_NOT_MODIFIED);
    }
    c.header('Content-Type', 'application/json');
    return c.body(body);
  };
}
