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
 * A body's elevation in words where the terrain decides (VENT-40): under
 * the level it reads «Sun 0.1° below level», since the terrain, not 0°,
 * is the horizon; and a second line says what the elevation alone would
 * get wrong: «Over the ridge» for a Sun seen under the level, «Behind
 * the terrain» for a body up but hidden. Hours not read against the
 * terrain keep «Sun 6.4° up» alone. Pure.
 */
import type { HourSample } from '@ventana/sim';
import type { I18n } from '../i18n/translate';
import { formatElevation } from './format';

export interface ElevationWords {
  /** «Sun 6.4° up», «Sun 0.1° below level». */
  readonly detail: string;
  /** «Over the ridge», «Behind the terrain»; undefined: nothing to add. */
  readonly terrain: string | undefined;
}

/** The elevation of `body` at `now` and whether it clears the terrain. */
function readingOf(body: 'sun' | 'earth', now: HourSample) {
  return body === 'sun'
    ? { el: now.sunEl, over: now.sunAboveTerrain }
    : { el: now.earthEl, over: now.earthAboveTerrain };
}

const BELOW_LEVEL = {
  sun: 'elevation.sunBelowLevel',
  earth: 'elevation.earthBelowLevel',
} as const;

/** The words of `body` at the hour `now`. */
export function terrainWords(
  body: 'sun' | 'earth',
  now: HourSample,
  i18n: I18n,
): ElevationWords {
  const { el, over } = readingOf(body, now);
  if (over === undefined || el >= 0) {
    const behind = over === false && el > 0;
    const terrain = behind ? i18n.t('terrain.behind') : undefined;
    return { detail: formatElevation(i18n, body, el), terrain };
  }
  const deg = `${i18n.number(Math.abs(el), 1)}°`;
  const ridge = over && body === 'sun';
  return {
    detail: i18n.t(BELOW_LEVEL[body], { deg }),
    terrain: ridge ? i18n.t('terrain.overRidge') : undefined,
  };
}
