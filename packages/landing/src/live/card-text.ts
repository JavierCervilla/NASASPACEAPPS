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
  const sunWord = hasSun(hour) ? 'live.up' : bodyDown(hour.sunEl);
  const link = earthLink(hour.earthEl, hour.earthAboveTerrain);
  const earthWord = link === 'low' ? 'live.low' : linkWord(link, hour.earthEl);
  return {
    when: instantText(answer.atMs, locale),
    sun: t(sunWord, { deg: deg.format(Math.abs(hour.sunEl)) }),
    earth: t(earthWord, { deg: deg.format(Math.abs(hour.earthEl)) }),
    verdict: t(answer.window ? 'live.window' : 'live.noWindow'),
    left: leftText(answer, t),
    listening: listeningText(answer, t),
  };
}

/** A body that is not seen: under the level, or up and behind terrain. */
function bodyDown(elevation: number): 'live.down' | 'live.hidden' {
  return elevation > 0 ? 'live.hidden' : 'live.down';
}

function linkWord(link: string, elevation: number) {
  return link === 'link' ? 'live.up' : bodyDown(elevation);
}

function leftText(answer: LiveAnswer, t: Translate): string {
  if (answer.changeInH === null) return t('live.noChange');
  const left = hoursText(answer.changeInH, t);
  return t(answer.window ? 'live.closesIn' : 'live.opensIn', { left });
}

function listeningText(answer: LiveAnswer, t: Translate): string {
  if (!answer.dsn) return t('live.noListening');
  const left = answer.dsnLeftMs === null ? '' : msText(answer.dsnLeftMs, t);
  return t('live.listening', { station: t(`dsn.${answer.dsn}`), left });
}
