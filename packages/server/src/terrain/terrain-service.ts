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
 * The terrain service (VENT-40): the horizon of any point from the LOLA
 * tiers present on disk, each band of distance reading its tiers in the
 * catalogue's order of preference, and only the blocks the rays cross.
 * The heights cost disk, not memory: a request holds its blocks while it
 * runs, an LRU keeps at most `cacheBytes` of them between requests, and
 * at most `maxRunning` requests run at once. The same service is meant to
 * serve height tiles around a point for the 3D view later (VENT-34,
 * docs/terrain-api.md).
 *
 * The ray-march is synchronous and pure, the disk is not, so a request
 * runs it in rounds: a probe that notes the blocks the rays cross (see
 * `tier-grid.ts`), then real rounds until no block is missing.
 */
import { BlockLoader } from './block-loader.ts';
import type { TerrainCatalogue, Tier } from './catalogue.ts';
import { Gate } from './gate.ts';
import {
  answer,
  bandsOf,
  march,
  type HorizonAnswer,
  type HorizonPoint,
} from './horizon-answer.ts';
import { presentTiers } from './tier-presence.ts';
import { TierGrid } from './tier-grid.ts';

export { TerrainBusyError } from './gate.ts';
export {
  TerrainUncoveredError,
  type HorizonAnswer,
  type HorizonPoint,
  type TierUse,
} from './horizon-answer.ts';

export interface TerrainServiceOptions {
  readonly dir: string;
  readonly catalogue: TerrainCatalogue;
  /** Bytes of grid blocks kept between requests. */
  readonly cacheBytes: number;
  /** Horizons computed at once. */
  readonly maxRunning: number;
  /** Requests that may wait for a slot; past them, TerrainBusyError. */
  readonly maxWaiting: number;
}

/** Rounds of the read: one probe, then real ones until nothing misses. */
const MAX_ROUNDS = 4;

/** Computes horizons from the tiers present under `dir`. */
export class TerrainService {
  /** The blocks in memory, shared by the requests. */
  readonly blocks: BlockLoader;
  /** The tiers found on disk. */
  readonly present: readonly Tier[];
  private readonly gate: Gate;
  private readonly catalogue: TerrainCatalogue;

  private constructor(options: TerrainServiceOptions, present: Tier[]) {
    this.present = present;
    this.catalogue = options.catalogue;
    this.blocks = new BlockLoader(options.dir, options.cacheBytes);
    this.gate = new Gate(options.maxRunning, options.maxWaiting);
  }

  /** A service over the tiers of `options.catalogue` found on disk. */
  static async open(options: TerrainServiceOptions): Promise<TerrainService> {
    const present = await presentTiers(options.dir, options.catalogue);
    return new TerrainService(options, present);
  }

  /** The horizon at `point`, in turn with the other requests. */
  horizon(point: HorizonPoint): Promise<HorizonAnswer> {
    return this.gate.run(() => this.compute(point));
  }

  private async compute(point: HorizonPoint): Promise<HorizonAnswer> {
    const grids = new Map(this.present.map((t) => [t.id, new TierGrid(t)]));
    const bands = bandsOf(this.catalogue.bands, grids);
    const { lat, lonEast, heightM } = point;
    const observer = { latDeg: lat, lonEastDeg: lonEast, heightM };
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = march(bands, observer);
      const all = [...grids.values()];
      const misses = all.some((g) => g.missing.size > 0);
      if (round > 0 && !misses) return answer(point, result, this.present);
      await Promise.all(all.map((g) => this.blocks.load(g)));
    }
    throw new Error('terrain: blocks still missing after every round');
  }

  /** Closes the files. */
  close(): Promise<void> {
    return this.blocks.close();
  }
}
