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
 * From the catalogue and a ray-march to the horizon route's answer
 * (VENT-40): the bands over a request's grids, the march with its
 * uncovered point named, and the answer with the tiers that served it.
 */
import {
  encodeProfile,
  terrainHorizon,
  type DemBand,
  type Observer,
  type TerrainHorizon,
} from '@ventana/sim';
import type { BandSpec, Tier } from './catalogue.ts';
import type { TierGrid } from './tier-grid.ts';

/** Where a horizon is asked for: the point and the eye's height. */
export interface HorizonPoint {
  readonly lat: number;
  readonly lonEast: number;
  readonly heightM: number;
}

/** A tier that served the rays, with its share of their stops. */
export interface TierUse {
  readonly id: string;
  readonly resolutionM: number;
  readonly share: number;
}

/** The answer of the horizon route, as JSON. */
export interface HorizonAnswer extends HorizonPoint {
  readonly bins: number;
  /** The profile, as `encodeProfile` of `@ventana/sim` writes it. */
  readonly profile: string;
  readonly groundM: number;
  readonly coverage: number;
  /** The tiers that answered, finest first. */
  readonly tiers: readonly TierUse[];
}

/** The point is covered by none of the tiers present. */
export class TerrainUncoveredError extends Error {
  override readonly name = 'TerrainUncoveredError';
}

/** The catalogue's bands over the grids of the tiers present. */
export function bandsOf(
  specs: readonly BandSpec[],
  grids: ReadonlyMap<string, TierGrid>,
): DemBand[] {
  return specs.map((band) => ({
    untilM: band.untilM,
    stepM: band.stepM,
    grids: band.tiers.flatMap((id) => grids.get(id)?.grid ?? []),
  }));
}

/** The ray-march, its RangeError as {@link TerrainUncoveredError}. */
export function march(
  bands: readonly DemBand[],
  observer: Observer,
): TerrainHorizon {
  try {
    return terrainHorizon(bands, observer);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new TerrainUncoveredError('no terrain grid covers the point');
    }
    throw error;
  }
}

/** The tiers' share of the stops, finest first, to 4 decimals. */
function uses(result: TerrainHorizon, tiers: readonly Tier[]): TierUse[] {
  const counts = result.stopsByGrid;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return tiers
    .filter((t) => counts[t.id] !== undefined)
    .map((t) => ({
      id: t.id,
      resolutionM: t.resolutionM,
      share: Math.round(((counts[t.id] ?? 0) / total) * 1e4) / 1e4,
    }))
    .sort((a, b) => a.resolutionM - b.resolutionM);
}

/** The route's answer for a computed horizon. */
export function answer(
  point: HorizonPoint,
  result: TerrainHorizon,
  present: readonly Tier[],
): HorizonAnswer {
  return {
    ...point,
    bins: result.profile.centiDeg.length,
    profile: encodeProfile(result.profile),
    groundM: Math.round(result.groundM * 10) / 10,
    coverage: Math.round(result.coverage * 1e4) / 1e4,
    tiers: uses(result, present),
  };
}
