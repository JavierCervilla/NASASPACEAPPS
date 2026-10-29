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

const OUT_DIR = new URL('../../sim/tests/fixtures/horizons/', import.meta.url);
const TEST_POINT = { lat: -89.5, lonEast: 0, altKm: 0 };
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
