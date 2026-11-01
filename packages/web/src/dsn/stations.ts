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
 * How the interface names the three DSN complexes: the antenna site, never
 * translated, and the region it serves, from the catalogue. Robledo is the
 * short name the cards use; the DSN view gives the whole one.
 */
import { DSN_SITES, type DsnComplex } from '@ventana/sim';
import type { TextKey } from '../i18n/catalogue';
import type { GeoDot } from './land-dots';

export interface Station {
  readonly short: string;
  readonly full: string;
  readonly place: TextKey;
}

export const STATIONS: Readonly<Record<DsnComplex, Station>> = {
  goldstone: { short: 'Goldstone', full: 'Goldstone', place: 'dsn.california' },
  canberra: { short: 'Canberra', full: 'Canberra', place: 'dsn.australia' },
  madrid: { short: 'Robledo', full: 'Robledo de Chavela', place: 'dsn.madrid' },
};

/** Where each complex's 70 m antenna stands, for the pictures. */
export function stationDot(complex: DsnComplex): GeoDot {
  const { lat, lonEast } = DSN_SITES[complex];
  return { latDeg: lat, lonDeg: lonEast };
}
