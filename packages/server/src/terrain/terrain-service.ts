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
 * serve height tiles around a point for the 3D view (VENT-34,
 * docs/terrain-api.md).
 *
 * A request reads in rounds (`horizon-rounds.ts`).
 */
import { BlockLoader } from './block-loader.ts';
import type { TerrainCatalogue, Tier } from './catalogue.ts';
import { Gate } from './gate.ts';
import type { HorizonAnswer, HorizonPoint } from './horizon-answer.ts';
import { readHorizon } from './horizon-rounds.ts';
import { presentTiers } from './tier-presence.ts';

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
  /** Levelled tiles computed at once; by default `maxRunning`. */
  readonly lodMaxRunning?: number;
  /** Levelled tiles that may wait for a slot; by default `maxWaiting`. */
  readonly lodMaxWaiting?: number;
}

/** Computes horizons from the tiers present under `dir`. */
export class TerrainService {
  /** The blocks in memory, shared by the requests. */
  readonly blocks: BlockLoader;
  /** The tiers found on disk at the last scan. */
  present: readonly Tier[];
  /** The cap on computations, shared by horizons and height tiles. */
  readonly gate: Gate;
  /**
   * The cap on levelled tiles (VENT-46), apart from `gate`: a client may
   * ask for dozens of them at once, and they must not fill the horizons'
   * queue.
   */
  readonly lodGate: Gate;
  private readonly catalogue: TerrainCatalogue;
  private readonly dir: string;

  private constructor(options: TerrainServiceOptions, present: Tier[]) {
    this.present = present;
    this.dir = options.dir;
    this.catalogue = options.catalogue;
    this.blocks = new BlockLoader(options.dir, options.cacheBytes);
    this.gate = new Gate(options.maxRunning, options.maxWaiting);
    this.lodGate = new Gate(
      options.lodMaxRunning ?? options.maxRunning,
      options.lodMaxWaiting ?? options.maxWaiting,
    );
  }

  /** A service over the tiers of `options.catalogue` found on disk. */
  static async open(options: TerrainServiceOptions): Promise<TerrainService> {
    const present = await presentTiers(options.dir, options.catalogue);
    return new TerrainService(options, present);
  }

  /**
   * Looks for the tiers on disk again (VENT-43): a tier fetched while the
   * server runs serves from the next request, without a restart.
   */
  async rescan(): Promise<void> {
    this.present = await presentTiers(this.dir, this.catalogue);
  }

  /**
   * The horizon at `point`, in turn with the other requests, from
   * `present` (the caller's view of the tiers, so a cache key names the
   * tiers that answered) or the tiers present now.
   */
  horizon(
    point: HorizonPoint,
    present: readonly Tier[] = this.present,
  ): Promise<HorizonAnswer> {
    // One request reads the tiers it started with, even across a rescan.
    const { blocks, catalogue } = this;
    return this.gate.run(() =>
      readHorizon({ blocks, bands: catalogue.bands, present }, point),
    );
  }

  /** Closes the files. */
  close(): Promise<void> {
    return this.blocks.close();
  }
}
