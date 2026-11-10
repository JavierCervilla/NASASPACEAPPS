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

import { earthLink, hasSun } from '@ventana/sim';
import type { Translate } from '../i18n/catalogue';
import type { Locale } from '../i18n/locales';
import type { LiveAnswer } from './answer';
import { hoursText, msText } from './duration';
import { degrees, instantText } from './format';

/** Every line of the live card, in one language. */
export interface CardText {
  readonly when: string;
  readonly sun: string;
  readonly earth: string;
  readonly verdict: string;
  readonly left: string;
  readonly listening: string;
}

/** The live card's lines for `answer`. */
export function cardText(
  answer: LiveAnswer,
  t: Translate,
  locale: Locale,
): CardText {
  const { hour } = answer;
  const deg = degrees(locale);
  const link = earthLink(hour.earthEl, hour.earthAboveTerrain);
  const earthWord =
    link === 'low' ? 'live.low' : bodyWord(link === 'link', hour.earthEl);
  return {
    when: instantText(answer.atMs, locale),
    sun: t(bodyWord(hasSun(hour), hour.sunEl), {
      deg: deg.format(Math.abs(hour.sunEl)),
    }),
    earth: t(earthWord, { deg: deg.format(Math.abs(hour.earthEl)) }),
    verdict: t(answer.window ? 'live.window' : 'live.noWindow'),
    left: leftText(answer, t),
    listening: listeningText(answer, link === 'link', t),
  };
}

/**
 * A body's words, as the app's tiles say them (VENT-40): seen over the
 * level, seen over a ridge while under the level, under the level, or up
 * and hidden by the terrain.
 */
function bodyWord(seen: boolean, elevation: number) {
  if (seen) return elevation >= 0 ? 'live.up' : 'live.overRidge';
  return elevation > 0 ? 'live.hidden' : 'live.down';
}

function leftText(answer: LiveAnswer, t: Translate): string {
  if (answer.changeInH === null) return t('live.noChange');
  const left = hoursText(answer.changeInH, t);
  return t(answer.window ? 'live.closesIn' : 'live.opensIn', { left });
}

/** The antenna line: the site's link with the Earth comes first (VENT-7). */
function listeningText(
  answer: LiveAnswer,
  linked: boolean,
  t: Translate,
): string {
  const station = answer.dsn ? t(`dsn.${answer.dsn}`) : null;
  if (!linked) {
    return station ? t('live.noLink', { station }) : t('live.noLinkNone');
  }
  if (!station) return t('live.noListening');
  if (answer.dsnLeftMs === null) return t('live.listeningOpen', { station });
  const left = msText(answer.dsnLeftMs, t);
  return t('live.listening', { station, left });
}
