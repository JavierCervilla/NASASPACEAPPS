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
 * The terrain's horizon of the curated sites (VENT-40), shipped with the
 * page: packages/sim/data/horizons.json, the profiles the server's script
 * worked out from NASA's LOLA grids, one per point south of 80° S. Each is
 * decoded the first time a view asks for its site.
 */
import { decodeProfile, type HorizonProfile } from '@ventana/sim';
import shipped from '../../../sim/data/horizons.json';

/**
 * The resolution the shipped profiles were seen at, metres: the step of
 * the nearest band, which reads LOLA's 20 m polar grid (every shipped
 * point is south of 80° S, inside it).
 */
export const SHIPPED_RESOLUTION_M: number =
  shipped.method.bands[0]?.stepM ?? Number.NaN;

/** The terrain's horizon of each site, by id; undefined: none known. */
export type TerrainOf = (id: string) => HorizonProfile | undefined;

/** No terrain anywhere: the smooth sphere. */
export const NO_TERRAIN: TerrainOf = () => undefined;

interface ShippedPoint {
  readonly ids: readonly string[];
  readonly profile: string;
}

/** The shipped profiles, by site id, decoded once each. */
export function shippedTerrain(
  points: readonly ShippedPoint[] = shipped.points,
): TerrainOf {
  const encoded = new Map<string, string>();
  for (const p of points) for (const id of p.ids) encoded.set(id, p.profile);
  const decoded = new Map<string, HorizonProfile>();
  return (id) => {
    const kept = decoded.get(id);
    if (kept) return kept;
    const text = encoded.get(id);
    if (text === undefined) return undefined;
    const profile = decodeProfile(text);
    decoded.set(id, profile);
    return profile;
  };
}
