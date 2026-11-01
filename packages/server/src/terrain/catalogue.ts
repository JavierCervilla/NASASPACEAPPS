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
 * The catalogue of LOLA elevation grids the terrain service may read
 * (VENT-40), from `data/terrain-catalogue.json`: tiers (one product each,
 * whole or in tiles, with its PDS label's projection and every file's URL,
 * size and sha256) and the bands of distance a horizon ray reads them in,
 * each with its tiers in order of preference. The order is ours: the
 * validated method of the realism study (20 m to 6 km, 80 m to 150 km,
 * 240 m to 200 km) with the global grids as fallbacks where the polar
 * caps end.
 */
import { readFile } from 'node:fs/promises';
import type { CylindricalProjection, PolarProjection } from '@ventana/sim';
import { BLOCK_SIZE } from './block-cache.ts';

/** One file of a tier: a whole product or one tile of it. */
export interface TierFile {
  readonly file: string;
  readonly url: string;
  readonly label: string;
  readonly labelSha256: string;
  readonly bytes: number;
  /** null until someone has hashed the whole file and pinned it. */
  readonly sha256: string | null;
  /** The tile's place in the tier's grid, in tiles from the top left. */
  readonly row: number;
  readonly col: number;
}

/** One product: its grid as a whole, and the files that hold it. */
export interface Tier {
  readonly id: string;
  /** MAP_SCALE, metres per pixel (at the equator for a cylindrical grid). */
  readonly resolutionM: number;
  readonly coverage: { readonly minLatDeg: number; readonly maxLatDeg: number };
  readonly lines: number;
  readonly samples: number;
  readonly metresPerDn: number;
  readonly radiusM: number;
  readonly projection: PolarProjection | CylindricalProjection;
  readonly tileLines: number;
  readonly tileSamples: number;
  readonly files: readonly TierFile[];
}

/** A band of a ray's distance and the tiers it reads, preferred first. */
export interface BandSpec {
  readonly untilM: number;
  readonly stepM: number;
  readonly tiers: readonly string[];
}

export interface TerrainCatalogue {
  readonly bands: readonly BandSpec[];
  readonly tiers: readonly Tier[];
}

/** The catalogue next to the code: `packages/server/data/`. */
export const DEFAULT_CATALOGUE_FILE = new URL(
  '../../data/terrain-catalogue.json',
  import.meta.url,
);

/**
 * Reads the catalogue. Checks only what would make a read go wrong: every
 * band names known tiers, every tile fits its tier's grid, and the tiles
 * of a tiled tier are whole blocks (a block never spans two files).
 */
export async function loadCatalogue(
  file: URL | string,
): Promise<TerrainCatalogue> {
  const raw = JSON.parse(await readFile(file, 'utf8')) as TerrainCatalogue;
  const ids = new Set(raw.tiers.map((tier) => tier.id));
  for (const band of raw.bands) {
    const unknown = band.tiers.find((id) => !ids.has(id));
    if (unknown) throw new TypeError(`catalogue: unknown tier "${unknown}"`);
  }
  for (const tier of raw.tiers) {
    const whole = (n: number): boolean => n % BLOCK_SIZE === 0;
    const blocky = whole(tier.tileLines) && whole(tier.tileSamples);
    if (tier.files.length > 1 && !blocky) {
      throw new TypeError(`catalogue: ${tier.id} tiles split blocks`);
    }
    for (const f of tier.files) {
      const fits = f.bytes === tier.tileLines * tier.tileSamples * 2;
      if (!fits) throw new TypeError(`catalogue: ${f.file} has a bad size`);
    }
  }
  return raw;
}
