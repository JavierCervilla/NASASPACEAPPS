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
 * Records the Horizons fixtures the tests run on. This is the only place that talks to Horizons on purpose; run it
 * by hand (it needs network) and commit the result:
 *
 *   node packages/server/scripts/record-fixtures.ts
 *
 * It writes one raw Horizons JSON body per target, observer and month into packages/sim/tests/fixtures/horizons/,
 * plus manifest.json, which maps each file to the query that produced it (the server tests serve them from a fake
 * fetch).
 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { BODY, DSN_COMPLEXES, DSN_SITES, monthsCovering, toHorizonsParams, type HorizonsQuery } from '../src/horizons/query.ts';
import { roundToGrid } from '../src/params.ts';

const OUT_DIR = new URL('../../sim/tests/fixtures/horizons/', import.meta.url);
const TEST_POINT = { lat: -89.5, lonEast: 0, altKm: 0 };
// IM-2 Athena's touchdown point (-84.7906, 29.1957 E, LROC), on the API's 0.01 degree grid as the service asks for it,
// so these files also answer the server's /api/v1/sites/im2-athena tests. Used for the longitude-sign check.
const IM2_POINT = { lat: roundToGrid(-84.7906), lonEast: roundToGrid(29.1957), altKm: 0 };
const FROM_MS = Date.UTC(2026, 10, 1);
const TO_MS = Date.UTC(2026, 11, 31, 23);

const client = createHorizonsClient({ fetch, cacheDir: await mkdtemp(join(tmpdir(), 'horizons-record-')) });
const manifest: { file: string; params: Record<string, string> }[] = [];
await mkdir(OUT_DIR, { recursive: true });

for (const month of monthsCovering(FROM_MS, TO_MS)) {
  const tag = month.start.slice(0, 7);
  const queries: [string, HorizonsQuery][] = [
    [`sun-from-moon-s89.5-e0-${tag}.json`, { target: BODY.sun, centerBody: BODY.moon, point: TEST_POINT, ...month }],
    [`earth-from-moon-s89.5-e0-${tag}.json`, { target: BODY.earth, centerBody: BODY.moon, point: TEST_POINT, ...month }],
    [`sun-from-moon-im2-athena-${tag}.json`, { target: BODY.sun, centerBody: BODY.moon, point: IM2_POINT, ...month }],
    [`earth-from-moon-im2-athena-${tag}.json`, { target: BODY.earth, centerBody: BODY.moon, point: IM2_POINT, ...month }],
    ...DSN_COMPLEXES.map((dsn): [string, HorizonsQuery] => [
      `moon-from-${dsn}-${tag}.json`,
      { target: BODY.moon, centerBody: BODY.earth, point: DSN_SITES[dsn], ...month },
    ]),
  ];
  for (const [file, query] of queries) {
    await writeFile(new URL(file, OUT_DIR), await client.raw(query), 'utf8');
    manifest.push({ file, params: toHorizonsParams(query) });
    console.log(`recorded ${file}`);
  }
}
await writeFile(new URL('manifest.json', OUT_DIR), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
