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
 * The terrain fetch at boot (VENT-43): with TERRAIN_FETCH_TIERS (`all`,
 * or tier ids separated by commas) and TERRAIN_DIR set, the server fetches
 * the tiers it lacks in the background once it listens, so a new volume
 * fills itself. `all` goes smallest first, so the most tiers serve the
 * soonest. A volume the server cannot write is said once in the log and
 * left alone: the route keeps serving what is there (503 with nothing).
 */
import {
  tierBytes,
  type TerrainCatalogue,
  type Tier,
} from './catalogue.ts';
import { acquireLock, type LockDeps } from './fetch-lock.ts';
import { FetchStatus } from './fetch-status.ts';
import { fetchTiers, MARGIN_BYTES } from './terrain-fetch.ts';
import type { TerrainSetup } from './terrain-config.ts';

/** The tiers TERRAIN_FETCH_TIERS asks for; null when it is unset. */
export function wantedTiers(
  raw: string | undefined,
  catalogue: TerrainCatalogue,
  log: (line: string) => void,
): Tier[] | null {
  if (raw === undefined || raw.trim() === '') return null;
  if (raw.trim() === 'all') {
    return [...catalogue.tiers].sort((a, b) => tierBytes(a) - tierBytes(b));
  }
  const ids = raw.split(',').map((id) => id.trim());
  const known = (id: string): Tier | undefined =>
    catalogue.tiers.find((t) => t.id === id);
  const unknown = ids.filter((id) => id !== '' && !known(id));
  if (unknown.length > 0) {
    log(`terrain fetch: unknown tiers ignored: ${unknown.join(', ')}`);
  }
  return ids.map(known).filter((t): t is Tier => t !== undefined);
}

/** The status of the terrain of `setup`, before any fetch. */
export function terrainStatusOf(setup: TerrainSetup): FetchStatus {
  const present = setup.service.present.map((t) => t.id);
  return new FetchStatus(setup.catalogue.tiers, present);
}

/** Fetches in the background what TERRAIN_FETCH_TIERS asks for. */
export async function fetchOnBoot(
  deps: LockDeps,
  setup: TerrainSetup,
  options: { readonly raw: string | undefined; readonly status: FetchStatus },
): Promise<void> {
  const { service, dir } = setup;
  const wanted = wantedTiers(options.raw, setup.catalogue, deps.log);
  if (wanted === null) return;
  const have = new Set(service.present.map((t) => t.id));
  const tiers = wanted.filter((t) => !have.has(t.id));
  if (tiers.length === 0) return options.status.run('done');
  if (!(await deps.fs.writable(dir))) {
    deps.log('terrain fetch: TERRAIN_DIR is not writable; nothing fetched');
    return options.status.run('stopped', 'notWritable');
  }
  await fetchLocked(deps, setup, { tiers, status: options.status });
}

/** Fetches `tiers` holding the volume's lock. */
async function fetchLocked(
  deps: LockDeps,
  { service, dir }: TerrainSetup,
  job: { readonly tiers: readonly Tier[]; readonly status: FetchStatus },
): Promise<void> {
  const release = await acquireLock(deps, dir, () => {
    deps.log('terrain fetch: another server holds the volume; waiting');
    job.status.run('stopped', 'locked');
  });
  try {
    const onTierReady = (): Promise<void> => service.rescan();
    const plan = { dir, ...job, onTierReady, marginBytes: MARGIN_BYTES };
    await fetchTiers(deps, plan);
  } finally {
    await release();
  }
}
