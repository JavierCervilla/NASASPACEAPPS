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

/** Loads the recorded Horizons fixtures (see fixtures/horizons/README.md). Test helper: reads files on purpose. */
import { readFileSync } from 'node:fs';
import { parseHorizonsTable, type HorizonsRow } from '../src/horizons-csv.ts';
import { buildHourSamples } from '../src/samples.ts';
import type { HourSample } from '../src/site.ts';

const DIR = new URL('./fixtures/horizons/', import.meta.url);
const MONTHS = ['2026-11', '2026-12'];

/** The `result` text of one fixture file. */
export function fixtureResult(file: string): string {
  return (JSON.parse(readFileSync(new URL(file, DIR), 'utf8')) as { result: string }).result;
}

/** The rows of one table over November and December 2026, for example `sun-from-moon-s89.5-e0`. */
export function fixtureRows(table: string): HorizonsRow[] {
  return MONTHS.flatMap((month) => parseHorizonsTable(fixtureResult(`${table}-${month}.json`)));
}

/** The hourly samples of the test point at 89.5° S, 0° E over November and December 2026. */
export function southPoleSamples(): HourSample[] {
  return buildHourSamples({
    sun: fixtureRows('sun-from-moon-s89.5-e0'),
    earth: fixtureRows('earth-from-moon-s89.5-e0'),
    moonFromDsn: {
      goldstone: fixtureRows('moon-from-goldstone'),
      canberra: fixtureRows('moon-from-canberra'),
      madrid: fixtureRows('moon-from-madrid'),
    },
  });
}
