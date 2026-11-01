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
 * The terrain service as the environment configures it (VENT-40): absent
 * without TERRAIN_DIR, else over the tiers of the catalogue found there.
 * The variables are listed in main.ts and docs/terrain-api.md.
 */
import { DEFAULT_CATALOGUE_FILE, loadCatalogue } from './catalogue.ts';
import { cachedHorizons, type HorizonSource } from './horizon-cache.ts';
import { TerrainService } from './terrain-service.ts';

const MB = 1024 * 1024;
const DEFAULTS = {
  cacheDir: './.cache/terrain',
  cacheMb: 256,
  blocksMb: 192,
  maxRunning: 2,
  maxWaiting: 16,
};

/** A positive number from `raw`, or `fallback` when unset. */
function positive(name: string, raw: string | undefined, fallback: number) {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`);
  }
  return value;
}

/** The horizon source of `env`, or undefined without TERRAIN_DIR. */
export async function openTerrain(
  env: Readonly<Record<string, string | undefined>>,
): Promise<HorizonSource | undefined> {
  const dir = env['TERRAIN_DIR'];
  if (dir === undefined || dir.trim() === '') return undefined;
  const service = await TerrainService.open({
    dir,
    catalogue: await loadCatalogue(DEFAULT_CATALOGUE_FILE),
    cacheBytes: positive('TERRAIN_BLOCKS_MB', env['TERRAIN_BLOCKS_MB'], DEFAULTS.blocksMb) * MB,
    maxRunning: Math.floor(positive('TERRAIN_MAX_RUNNING', env['TERRAIN_MAX_RUNNING'], DEFAULTS.maxRunning)),
    maxWaiting: DEFAULTS.maxWaiting,
  });
  const tiers = service.present.map((t) => t.id).join(', ') || 'none';
  process.stdout.write(`terrain: tiers present: ${tiers}\n`);
  const cacheMb = positive('TERRAIN_CACHE_MB', env['TERRAIN_CACHE_MB'], DEFAULTS.cacheMb);
  return cachedHorizons(service, env['TERRAIN_CACHE_DIR'] ?? DEFAULTS.cacheDir, cacheMb * MB);
}
