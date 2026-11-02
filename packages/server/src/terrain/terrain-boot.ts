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
 * soonest. A tier with a file whose sha256 is not pinned is refused. A
 * volume the server cannot write is said once in the log and left alone:
 * the route keeps serving what is there (503 with nothing).
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

/**
 * The tiers of `wanted` whose every file has a pinned sha256 (seguridad):
 * the server never installs a file it cannot check. A refused tier is said
 * in the log and stays missing.
 */
function pinnedOnly(wanted: readonly Tier[], log: (line: string) => void) {
  return wanted.filter((tier) => {
    const loose = tier.files.find((f) => f.sha256 === null);
    if (!loose) return true;
    const why = `${loose.file} has no pinned sha256 in the catalogue`;
    log(`terrain fetch: ${tier.id} refused: ${why}`);
    return false;
  });
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
  const missing = wanted.filter((t) => !have.has(t.id));
  const tiers = pinnedOnly(missing, deps.log);
  if (tiers.length === 0) return options.status.run('done');
  if (!(await deps.fs.writable(dir))) {
    deps.log('terrain fetch: TERRAIN_DIR is not writable; nothing fetched');
    return options.status.run('stopped', 'notWritable');
  }
  const onTierReady = (): Promise<void> => service.rescan();
  const job = { tiers, status: options.status };
  await fetchLocked(deps, { dir, onTierReady }, job);
}

/** Where a locked fetch writes, and who hears of each tier it installs. */
export interface LockedTarget {
  readonly dir: string;
  readonly onTierReady: (tier: Tier) => Promise<void>;
}

/**
 * Fetches `tiers` holding the volume's lock, for the server at boot and
 * for scripts/fetch-terrain.ts; the lock goes even when the fetch throws
 * or is aborted. A lock lost to another server aborts the fetch.
 */
export async function fetchLocked(
  deps: LockDeps,
  { dir, onTierReady }: LockedTarget,
  job: { readonly tiers: readonly Tier[]; readonly status: FetchStatus },
): Promise<void> {
  const lost = new AbortController();
  const release = await acquireLock(deps, dir, () => {
    deps.log('terrain fetch: another server holds the volume; waiting');
    job.status.run('stopped', 'locked');
  }, () => {
    deps.log('terrain fetch: lost the volume lock to another server; stopping');
    lost.abort(new Error('lost the volume lock'));
  });
  const outer = deps.signal;
  const signal = outer ? AbortSignal.any([outer, lost.signal]) : lost.signal;
  try {
    const plan = { dir, ...job, onTierReady, marginBytes: MARGIN_BYTES };
    await fetchTiers({ ...deps, signal }, plan);
  } finally {
    await release();
  }
}
