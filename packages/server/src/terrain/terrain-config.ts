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
import { join } from 'node:path';
import {
  DEFAULT_CATALOGUE_FILE,
  loadCatalogue,
  type TerrainCatalogue,
} from './catalogue.ts';
import { cachedHorizons, type HorizonSource } from './horizon-cache.ts';
import { TerrainService } from './terrain-service.ts';
import { cachedLod, type LodSource } from './lod-cache.ts';
import { cachedTiles, type TileSource } from './tile-cache.ts';

const MB = 1024 * 1024;
const DEFAULTS = {
  cacheDir: './.cache/terrain',
  cacheMb: 256,
  tileCacheMb: 512,
  lodCacheMb: 512,
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

/** The terrain of a server: its horizons and what serves them. */
export interface TerrainSetup {
  readonly horizons: HorizonSource;
  readonly tiles?: TileSource;
  readonly lod?: LodSource;
  readonly service: TerrainService;
  readonly dir: string;
  readonly catalogue: TerrainCatalogue;
}

/** The terrain of `env`, or undefined without TERRAIN_DIR. */
export async function openTerrain(
  env: Readonly<Record<string, string | undefined>>,
): Promise<TerrainSetup | undefined> {
  const dir = env['TERRAIN_DIR'];
  if (dir === undefined || dir.trim() === '') return undefined;
  const catalogue = await loadCatalogue(DEFAULT_CATALOGUE_FILE);
  const service = await TerrainService.open({
    dir,
    catalogue,
    cacheBytes: positive('TERRAIN_BLOCKS_MB', env['TERRAIN_BLOCKS_MB'], DEFAULTS.blocksMb) * MB,
    maxRunning: Math.floor(positive('TERRAIN_MAX_RUNNING', env['TERRAIN_MAX_RUNNING'], DEFAULTS.maxRunning)),
    maxWaiting: DEFAULTS.maxWaiting,
  });
  const tiers = service.present.map((t) => t.id).join(', ') || 'none';
  process.stdout.write(`terrain: tiers present: ${tiers}\n`);
  const cacheMb = positive('TERRAIN_CACHE_MB', env['TERRAIN_CACHE_MB'], DEFAULTS.cacheMb);
  const cacheDir = env['TERRAIN_CACHE_DIR'] ?? DEFAULTS.cacheDir;
  const horizons = cachedHorizons(service, cacheDir, cacheMb * MB);
  const tileCache = join(cacheDir, 'tiles');
  const tileMb = positive('TERRAIN_TILE_CACHE_MB', env['TERRAIN_TILE_CACHE_MB'], DEFAULTS.tileCacheMb);
  const tiles = cachedTiles(service, tileCache, tileMb * MB);
  const lodMb = positive('TERRAIN_LOD_CACHE_MB', env['TERRAIN_LOD_CACHE_MB'], DEFAULTS.lodCacheMb);
  const lod = cachedLod(service, join(cacheDir, 'lod'), lodMb * MB);
  return { horizons, tiles, lod, service, dir, catalogue };
}
