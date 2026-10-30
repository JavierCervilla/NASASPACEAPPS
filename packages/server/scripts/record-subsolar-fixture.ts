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
 * Records the Horizons fixture the sub-solar point model is checked against (packages/sim/src/sun.ts). Like
 * record-fixtures.ts, it is the only other place that talks to Horizons on purpose; run it by hand (it needs network)
 * and commit the result:
 *
 *   NODE_USE_ENV_PROXY=1 node packages/server/scripts/record-subsolar-fixture.ts
 *
 * One request: the Moon (301) seen from the geocentre (500@399), QUANTITIES='15' (the Sun's sub-longitude and
 * sub-latitude on the target), daily from 2026-11-01 to 2026-12-31. It writes the raw JSON body into
 * packages/sim/tests/fixtures/horizons/ and adds or replaces its entry in manifest.json. The service never sends this
 * query, so it goes straight to the API instead of through the service's client, which only builds QUANTITIES='4'.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { HORIZONS_API_URL } from '../src/horizons/client.ts';

const OUT_DIR = new URL('../../sim/tests/fixtures/horizons/', import.meta.url);
const FILE = 'moon-subsolar-from-geocentre-2026-11-12.json';
const PARAMS: Record<string, string> = {
  format: 'json',
  COMMAND: "'301'",
  MAKE_EPHEM: "'YES'",
  EPHEM_TYPE: "'OBSERVER'",
  CENTER: "'500@399'",
  START_TIME: "'2026-11-01 00:00'",
  STOP_TIME: "'2026-12-31 00:00'",
  STEP_SIZE: "'1 d'",
  QUANTITIES: "'15'",
  CSV_FORMAT: "'YES'",
};

const response = await fetch(`${HORIZONS_API_URL}?${new URLSearchParams(PARAMS).toString()}`);
const body = await response.text();
if (!response.ok || !body.includes('$$SOE')) throw new Error(`Horizons answered ${response.status}: ${body.slice(0, 200)}`);
await writeFile(new URL(FILE, OUT_DIR), body, 'utf8');

const manifestUrl = new URL('manifest.json', OUT_DIR);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8')) as { file: string; params: Record<string, string> }[];
const entries = [...manifest.filter((entry) => entry.file !== FILE), { file: FILE, params: PARAMS }];
await writeFile(manifestUrl, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
console.log(`recorded ${FILE}`);
