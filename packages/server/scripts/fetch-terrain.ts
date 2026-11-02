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
 * Fetches the LOLA tiers of the terrain catalogue (data/terrain-catalogue.json, VENT-40) into the terrain volume, for
 * the server's TERRAIN_DIR and for terrain-horizons.ts. Nothing goes into git or the image. A thin wrapper over
 * src/terrain/terrain-fetch.ts (VENT-43), the same code the server runs at boot with TERRAIN_FETCH_TIERS: one file at a
 * time into `<name>.part`, continued with an HTTP Range request, checked against its size and pinned sha256 before the
 * rename, stopped when the volume would keep less than 2 GB free, and holding the volume's lock, so it never writes a
 * file a running server is fetching. Tiers not asked for are skipped; a complete file is not fetched again.
 *
 *   node packages/server/scripts/fetch-terrain.ts --dir /data/terrain                 # every tier (about 48.6 GB)
 *   node packages/server/scripts/fetch-terrain.ts --dir /data/terrain --tiers polar-south-20m,polar-south-80m
 *   node packages/server/scripts/fetch-terrain.ts --list                                # tiers and sizes
 *   NODE_USE_ENV_PROXY=1 ...                                                            # behind a proxy
 */
import { parseArgs } from 'node:util';
import { DEFAULT_CATALOGUE_FILE, loadCatalogue, tierBytes } from '../src/terrain/catalogue.ts';
import { acquireLock } from '../src/terrain/fetch-lock.ts';
import { FetchStatus } from '../src/terrain/fetch-status.ts';
import { nodeFetchDeps } from '../src/terrain/node-fetch-deps.ts';
import { wantedTiers } from '../src/terrain/terrain-boot.ts';
import { fetchTiers, MARGIN_BYTES } from '../src/terrain/terrain-fetch.ts';

const GB = 1e9;

const { values } = parseArgs({
  options: { dir: { type: 'string' }, tiers: { type: 'string' }, list: { type: 'boolean', default: false } },
});
const catalogue = await loadCatalogue(DEFAULT_CATALOGUE_FILE);

if (values.list) {
  for (const tier of catalogue.tiers) {
    const bytes = tierBytes(tier);
    process.stdout.write(`${tier.id.padEnd(18)} ${String(tier.resolutionM).padStart(6)} m  ${(bytes / GB).toFixed(2)} GB  ${tier.files.length} file(s)\n`);
  }
} else {
  const dir = values.dir;
  if (!dir) throw new Error('usage: fetch-terrain.ts --dir <terrain dir> [--tiers a,b] | --list');
  const deps = nodeFetchDeps();
  const tiers = wantedTiers(values.tiers ?? 'all', catalogue, (line) => {
    throw new Error(line);
  });
  if (!(await deps.fs.writable(dir))) throw new Error(`${dir} cannot be written`);
  const release = await acquireLock(deps, dir, () => deps.log('another fetch holds the volume; waiting'));
  const status = new FetchStatus(catalogue.tiers, []);
  try {
    await fetchTiers(deps, { dir, tiers: tiers ?? [], status, marginBytes: MARGIN_BYTES, onTierReady: async () => undefined });
  } finally {
    await release();
  }
  const { fetch: state, reason } = status.snapshot();
  if (state !== 'done' || status.snapshot().tiers.some((t) => t.state === 'failed')) {
    throw new Error(`fetch ${state}${reason ? ` (${reason})` : ''}`);
  }
}
