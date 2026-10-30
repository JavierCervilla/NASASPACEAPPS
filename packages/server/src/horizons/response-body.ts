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

/** Validation and parsing of a Horizons response body. */
import { parseHorizonsTable, type HorizonsRow } from '@ventana/sim';
import { HorizonsError, excerpt } from './errors.ts';

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new HorizonsError(
      'parse',
      `Horizons answered with a body that is not JSON: ${excerpt(body)}`,
    );
  }
}

/**
 * Checks that a Horizons body holds an observer table and returns its
 * `result` text.
 *
 * @throws HorizonsError (`parse`) for a body that is not the expected JSON,
 *   (`api`) for an error reported by Horizons in `error` or as a `result`
 *   without a `$$SOE..$$EOE` table.
 */
export function horizonsResultText(body: string): string {
  const json = parseJson(body);
  if (typeof json !== 'object' || json === null) {
    throw new HorizonsError(
      'parse',
      'Horizons answered with JSON that is not an object',
    );
  }
  const { error, result } = json as { error?: unknown; result?: unknown };
  if (typeof error === 'string') {
    throw new HorizonsError('api', `Horizons error: ${excerpt(error)}`);
  }
  if (typeof result !== 'string') {
    throw new HorizonsError('parse', 'Horizons JSON has no "result" text');
  }
  if (!result.includes('$$SOE') || !result.includes('$$EOE')) {
    throw new HorizonsError(
      'api',
      `Horizons returned no ephemeris: ${excerpt(result)}`,
    );
  }
  return result;
}

/** The rows of a valid body. */
export function parseRows(body: string): HorizonsRow[] {
  const result = horizonsResultText(body);
  try {
    return parseHorizonsTable(result);
  } catch (error) {
    throw new HorizonsError('parse', (error as Error).message);
  }
}
