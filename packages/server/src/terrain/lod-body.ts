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
 * The body of a levelled tile answer in the format its url asks for
 * (VENT-98): the JSON of `lod-answer.ts`, or its binary form
 * (`lod-binary.ts`) as `application/octet-stream`, which the API's
 * compression gzips (`compressible.ts`).
 */
import type { Context } from 'hono';
import type { LodAnswer } from './lod-answer.ts';
import { lodBinary } from './lod-binary.ts';
import type { TileFormat } from './lod-params.ts';

export const BINARY_TYPE = 'application/octet-stream';

/** `answer` in `format`, with the headers the route already set. */
export function tileBody(
  c: Context,
  answer: LodAnswer,
  format: TileFormat,
): Response {
  if (format === 'json') return c.json(answer);
  c.header('Content-Type', BINARY_TYPE);
  return c.body(lodBinary(answer));
}

/** The query a ring url adds after its version token for `format`. */
export function formatQuery(format: TileFormat): string {
  return format === 'bin' ? '&format=bin' : '';
}
