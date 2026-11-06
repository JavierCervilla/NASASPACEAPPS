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
 * The shared instant and the Sun at the selected point, for the readout's
 * instant line (VENT-105): the simulator's sky, as the night notice reads
 * it, and day or night by `isNight`, against the point's horizon profile
 * where the app has one, else the level.
 */
import { skyAt, type HorizonProfile } from '@ventana/sim';
import { isNight } from '../terrain/night-light';
import type { InstantReading } from './condition-lines';

/** The selected point, with its horizon profile when the app has one. */
export interface InstantPlace {
  readonly lat: number;
  readonly lonEast: number;
  readonly profile: HorizonProfile | null;
}

/** The shared instant and the selected point, handed in by the island. */
export interface InstantSource {
  readonly time: { get(): { readonly atMs: number; readonly live: boolean } };
  readonly place: () => InstantPlace | null;
}

/** The instant of `source` and the Sun at its point, read now. */
export function readInstant(source: InstantSource): InstantReading {
  const { atMs, live } = source.time.get();
  const place = source.place();
  if (!place) return { atMs, live, sun: null };
  const sky = skyAt({ latDeg: place.lat, lonEastDeg: place.lonEast }, atMs);
  const night = isNight(sky, place.profile);
  const terrain = place.profile !== null;
  return { atMs, live, sun: { elDeg: sky.sunEl, night, terrain } };
}
