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
 * Where the Deep Space Network listens from: the 70 m antenna of each complex.
 * The server asks Horizons for the Moon from these points and the analytic sky
 * computes it from the same ones, so both answer for the same antennas.
 */
import type { DsnComplex } from './site.ts';

/**
 * A point on the Earth: WGS 84 geodetic latitude and east longitude in
 * degrees, height in km.
 */
export interface GeodeticSite {
  readonly lat: number;
  readonly lonEast: number;
  readonly altKm: number;
}

/**
 * The 70 m antenna of each Deep Space Network complex (DSS 14, DSS 43, DSS 63),
 * WGS 84 geodetic coordinates from DSN Telecommunications Link Design Handbook
 * 810-005, module 301 rev. N «Coverage and Geometry», Table 5
 * (https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301N.pdf), converted from
 * degrees-minutes-seconds: DSS 14 35°25'33.24" N 243°06'37.66" E, DSS 43
 * 35°24'08.73" S 148°58'52.56" E, DSS 63 40°25'52.36" N 355°45'07.17" E.
 */
export const DSN_SITES: Readonly<Record<DsnComplex, GeodeticSite>> = {
  goldstone: { lat: 35.425901, lonEast: -116.889538, altKm: 1.001 },
  canberra: { lat: -35.402424, lonEast: 148.981267, altKm: 0.689 },
  madrid: { lat: 40.43121, lonEast: -4.248009, altKm: 0.865 },
};

/**
 * Order in which the DSN complexes are queried and reported; ties in
 * `activeDsn` go to the first.
 */
export const DSN_COMPLEXES: readonly DsnComplex[] = [
  'goldstone',
  'canberra',
  'madrid',
];
