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
 * Fetches LOLA tiers into the terrain volume one file at a time (VENT-43),
 * for the server at boot and for scripts/fetch-terrain.ts. Before each
 * file it checks the room left on the volume and stops, with a log line,
 * when the file and a margin would not fit: the fetch never fills the
 * disk. A file that keeps failing marks its tier failed and the next tier
 * goes on. A tier whose files are all in place is handed to `onTierReady`
 * (the server re-scans its tiers), so it serves without a restart.
 */
import { join } from 'node:path';
import type { Tier, TierFile } from './catalogue.ts';
import type { FetchStatus } from './fetch-status.ts';
import {
  fetchFile,
  type FetchDeps,
  type FileJob,
} from './file-fetch.ts';

/** Room kept free on the volume past the file being fetched. */
export const MARGIN_BYTES = 2 * 1024 ** 3;

export interface TierFetchPlan {
  readonly dir: string;
  /** The tiers to fetch, in order; complete files are skipped. */
  readonly tiers: readonly Tier[];
  readonly status: FetchStatus;
  readonly marginBytes: number;
  readonly onTierReady: (tier: Tier) => Promise<void>;
}

type Outcome = 'installed' | 'failed' | 'disk';

/** Whether the volume has room for the rest of `file` and the margin. */
async function roomFor(deps: FetchDeps, plan: TierFetchPlan, f: TierFile) {
  const path = join(plan.dir, f.file);
  if ((await deps.fs.size(path)) === f.bytes) return true;
  const have = Math.max(0, await deps.fs.size(`${path}.part`));
  const lacking = Math.max(0, f.bytes - have);
  const free = await deps.fs.freeBytes(plan.dir);
  if (free >= lacking + plan.marginBytes) return true;
  deps.log(
    `terrain fetch: stopped: ${free} bytes free, ${f.file} needs ` +
      `${lacking} more and a margin of ${plan.marginBytes}`,
  );
  return false;
}

/**
 * Fetches `job`'s file; false, with a log line, when it failed. An abort
 * (shutdown) is no failure: it goes up and stops the whole fetch.
 */
async function fetchOrLog(deps: FetchDeps, job: FileJob): Promise<boolean> {
  try {
    await fetchFile(deps, job);
    return true;
  } catch (error) {
    if (deps.signal?.aborted) throw error;
    const why = (error as Error).message;
    deps.log(`terrain fetch: ${job.tierId} failed at ${job.file.file}: ${why}`);
    return false;
  }
}

/** Fetches every file of `tier`, then announces it. */
async function fetchTier(
  deps: FetchDeps,
  plan: TierFetchPlan,
  tier: Tier,
): Promise<Outcome> {
  const { status, dir } = plan;
  status.set(tier.id, 'fetching');
  let before = 0;
  for (const file of tier.files) {
    if (!(await roomFor(deps, plan, file))) return 'disk';
    const onBytes = (done: number): void =>
      status.bytes(tier.id, before + done);
    const job = { dir, tierId: tier.id, file, onBytes };
    if (!(await fetchOrLog(deps, job))) return 'failed';
    before += file.bytes;
    status.bytes(tier.id, before);
  }
  await plan.onTierReady(tier);
  deps.log(`terrain fetch: ${tier.id} installed`);
  return 'installed';
}

/** Fetches the tiers of `plan` in turn; resolves when it stops. */
export async function fetchTiers(
  deps: FetchDeps,
  plan: TierFetchPlan,
): Promise<void> {
  const { status } = plan;
  status.run('running');
  for (const tier of plan.tiers) status.set(tier.id, 'queued');
  for (const tier of plan.tiers) {
    const outcome = await fetchTier(deps, plan, tier);
    if (outcome === 'disk') {
      status.run('stopped', 'disk');
      return;
    }
    status.set(tier.id, outcome);
  }
  status.run('done');
  deps.log('terrain fetch: done');
}
