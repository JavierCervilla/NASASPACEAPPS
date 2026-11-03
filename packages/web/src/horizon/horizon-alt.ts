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
 * The horizon strip in words, for a screen reader (VENT-40): which way
 * the Sun and the Earth are, on eight points of the compass, and whether
 * the horizon hides them: the terrain's where it is known, else the
 * smooth sphere's. Pure.
 */
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import type { BodyAt } from './strip-marks';

/** The eight points, from north clockwise. */
const DIRECTIONS: readonly TextKey[] = [
  'horizon.dirN',
  'horizon.dirNE',
  'horizon.dirE',
  'horizon.dirSE',
  'horizon.dirS',
  'horizon.dirSW',
  'horizon.dirW',
  'horizon.dirNW',
];

/** The point of the compass of `azDeg`: 0 north, 1 north-east… to 7. */
export function octantOf(azDeg: number): number {
  const n = DIRECTIONS.length;
  return Math.round((((azDeg % 360) + 360) % 360) / (360 / n)) % n;
}

/** «to the north-west»: the point of the compass of `azDeg`. */
export function directionOf(i18n: I18n, azDeg: number): string {
  return i18n.t(DIRECTIONS[octantOf(azDeg)] ?? 'horizon.dirN');
}

/** Each body's sentence, by whether it shows, over terrain or not. */
const SENTENCES = {
  sun: {
    terrain: ['horizon.sunBehindTerrain', 'horizon.sunOverTerrain'],
    smooth: ['horizon.sunBelowHorizon', 'horizon.sunAboveHorizon'],
  },
  earth: {
    terrain: ['horizon.earthBehindTerrain', 'horizon.earthOverTerrain'],
    smooth: ['horizon.earthBelowHorizon', 'horizon.earthAboveHorizon'],
  },
} as const satisfies Record<string, Record<string, readonly TextKey[]>>;

/** «The Sun is to the north-west, above the terrain.» */
export function bodySentence(
  i18n: I18n,
  body: BodyAt,
  terrain: boolean,
): string {
  const keys = SENTENCES[body.id][terrain ? 'terrain' : 'smooth'];
  const dir = directionOf(i18n, body.azDeg);
  return i18n.t(keys[body.visible ? 1 : 0], { dir });
}

/**
 * The strip's text alternative: what it is, then each body's sentence
 * when the bodies are known.
 */
export function horizonAlt(
  i18n: I18n,
  bodies: readonly BodyAt[],
  terrain: boolean,
): string {
  const lines = bodies.map((body) => bodySentence(i18n, body, terrain));
  return [i18n.t('horizon.alt'), ...lines].join(' ');
}
