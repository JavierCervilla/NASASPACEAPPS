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
 * Precomputes the terrain horizon of every curated site south of 80° S (VENT-40), the profiles the web ships so the
 * curated sites answer at once and offline. It runs the server's terrain service (the same pure ray-march of
 * @ventana/sim the /api/v1/horizon route runs) over the south polar tiers only, LDEM_80S_20M, LDEM_80S_80M and
 * LDEM_75S_240M (the method the realism study validated against NASA's AVGVISIB map), with LDEM_128 past their rim. Sites that share a point share a
 * profile. Run it by hand with the three grids in a directory (scripts/fetch-terrain.ts fetches them) and commit:
 *
 *   node packages/server/scripts/terrain-horizons.ts --dir <terrain dir>          # writes the file
 *   node packages/server/scripts/terrain-horizons.ts --dir <terrain dir> --check  # recomputes and compares
 *
 * Output: packages/sim/data/horizons.json, with the method and every grid's URL and sha256 in its header.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import type { Site } from '@ventana/sim';
import { DEFAULT_CATALOGUE_FILE, loadCatalogue, type TerrainCatalogue } from '../src/terrain/catalogue.ts';
import { TerrainService } from '../src/terrain/terrain-service.ts';

const SITES = new URL('../data/sites.json', import.meta.url);
const OUT = new URL('../../sim/data/horizons.json', import.meta.url);
/**
 * The tiers of the validated method, and LDEM_128 (global, 237 m) where they end: only rays from sites near 80° S
 * reach past the 240 m cap's rim at 75° S.
 */
const TIERS = ['polar-south-20m', 'polar-south-80m', 'polar-south-240m', 'global-237m'];
/** Our choice: the eye 2 m above the ground, a lander's deck. */
const OBSERVER_HEIGHT_M = 2;
/** The rim of LDEM_80S_20M: the near field of a site further north would come from a coarser grid. */
const SOUTH_OF_DEG = -80;

const { values } = parseArgs({ options: { dir: { type: 'string' }, check: { type: 'boolean', default: false } } });
if (!values.dir) throw new Error('usage: terrain-horizons.ts --dir <terrain dir> [--check]');

/** The catalogue with the validated tiers only, in every band. */
function southOnly(catalogue: TerrainCatalogue): TerrainCatalogue {
  const tiers = catalogue.tiers.filter((t) => TIERS.includes(t.id));
  const bands = catalogue.bands.map((b) => ({ ...b, tiers: b.tiers.filter((id) => TIERS.includes(id)) }));
  return { tiers, bands };
}

const catalogue = southOnly(await loadCatalogue(DEFAULT_CATALOGUE_FILE));
const service = await TerrainService.open({
  dir: values.dir,
  catalogue,
  cacheBytes: 256 * 2 ** 20,
  maxRunning: 1,
  maxWaiting: 1,
});
if (service.present.length !== TIERS.length) throw new Error(`missing tiers in ${values.dir}: need ${TIERS.join(', ')}`);

const sites = (JSON.parse(await readFile(SITES, 'utf8')) as Site[]).filter((s) => s.lat < SOUTH_OF_DEG);
const byPoint = new Map<string, { ids: string[]; lat: number; lonEast: number }>();
for (const s of sites) {
  const key = `${s.lat},${s.lonEast}`;
  const point = byPoint.get(key) ?? { ids: [], lat: s.lat, lonEast: s.lonEast };
  point.ids.push(s.id);
  byPoint.set(key, point);
}

const points = [];
for (const { ids, lat, lonEast } of byPoint.values()) {
  const answer = await service.horizon({ lat, lonEast, heightM: OBSERVER_HEIGHT_M });
  points.push({ ids, lat, lonEast, groundM: answer.groundM, coverage: answer.coverage, profile: answer.profile });
  process.stdout.write(`${ids.join(', ')}: ground ${answer.groundM} m\n`);
}
await service.close();

const document = {
  about:
    "The terrain's horizon at every curated site south of 80 deg S (VENT-40), from packages/server/scripts/terrain-horizons.ts. Each profile: 720 azimuth bins (bin i centred on i * 0.5 deg, clockwise from north), the terrain's elevation angle in hundredths of a degree as little-endian int16, in base64 (decodeProfile of @ventana/sim).",
  method: {
    rayMarch: 'terrainHorizon of @ventana/sim: great-circle rays on the 1737.4 km sphere (curvature included), the highest elevation angle along each, bilinear heights',
    observerHeightM: OBSERVER_HEIGHT_M,
    observerHeightNote: 'Our choice (a lander deck). The height only changes the near field: a far ridge stands at nearly the same angle from 2 m or 10 m.',
    bins: 720,
    units: '0.01 deg',
    bands: catalogue.bands.map(({ untilM, stepM, tiers }) => ({ untilM, stepM, tiers })),
    bandsNote: 'Our choice, the method of the realism study (2026-11-01) validated against NASA PGDA AVGVISIB_75S_120M.',
  },
  sources: catalogue.tiers.map((t) => ({ tier: t.id, ...t.files[0] })),
  points,
};
const text = `${JSON.stringify(document, null, 1)}\n`;

if (values.check) {
  const committed = await readFile(OUT, 'utf8');
  if (committed !== text) throw new Error('horizons.json differs from a fresh computation');
  process.stdout.write('horizons.json matches a fresh computation\n');
} else {
  await writeFile(OUT, text, 'utf8');
  process.stdout.write(`wrote ${points.length} profiles\n`);
}
