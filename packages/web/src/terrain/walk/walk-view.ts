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
 * What the panel shows of the walk (VENT-121, chip 3A): nothing at the
 * point; away from it the chip's two lines, «180 m NE of IM-2» and the state
 * there («Window here»), what the live region says on arrival, and, once
 * the eye was held to the reach, the edge card's sentence. Pure.
 */
import type { I18n } from '../../i18n/translate';
import type { NowState } from '../../phone/widget-types';
import type { EyeReport, SkyDirs } from '../scene/scene-types';
import { eyeState } from './eye-state';
import { isAway } from './walk-reach';
import { distanceText, hereText, whereText } from './walk-words';

/**
 * The sky at the instant, and whether the site is in permanent shadow
 * (VENT-128): the eye inherits the point's flag, since NASA's map marks a
 * crater floor kilometres across and the eye stays within 1.5 km.
 */
export type WalkSky = SkyDirs & { readonly sunHidden?: boolean | undefined };

export interface WalkView {
  readonly where: string;
  readonly state: NowState;
  readonly here: string;
  /** The live region's sentence. */
  readonly said: string;
  /** The edge card's sentence, when the eye stands at the reach's edge. */
  readonly edge: string | null;
}

/** The walk's words for `eye` under `sky` near the site named `site`. */
export function walkView(
  i18n: I18n,
  eye: EyeReport | null,
  sky: WalkSky | null,
  site: string,
): WalkView | null {
  if (!eye?.sight || !sky || !isAway(eye.at)) return null;
  const state = eyeState({ sunEl: sky.sunEl, earthEl: sky.earthEl,
    ...eye.sight, sunHidden: sky.sunHidden });
  const where = whereText(i18n, eye.at, site);
  const here = hereText(i18n, state);
  const distance = distanceText(i18n, Math.hypot(eye.at[0], eye.at[1]));
  return { where, state, here,
    said: i18n.t('walk.said', { where, state: here }),
    edge: eye.edge ? i18n.t('walk.edge.body', { distance, site }) : null };
}
