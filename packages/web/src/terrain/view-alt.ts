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
 * The on-foot view's text alternative (VENT-34): which way the view
 * faces, where the Sun and the Earth are (horizon-alt.ts's sentences) and
 * what hides them: a ridge in reach, with its height and distance, or the
 * terrain beyond the tile; and, once the eye walked away from the point,
 * where it stands from it (VENT-121). Pure.
 */
import type { I18n } from '../i18n/translate';
import { bodySentence, directionOf } from '../horizon/horizon-alt';
import type { BodyAt } from '../horizon/strip-marks';
import type { Blocker } from './ridge';
import { localSize } from './ring/ring-local';
import { ridgeParams } from './view-text';
import type { EyeReport } from './scene/scene-types';
import { isAway } from './walk/walk-reach';
import { whereText } from './walk/walk-words';

export interface SeenBody extends BodyAt {
  readonly blocker: Blocker;
}

const HIDES = {
  sun: { ridge: 'onFoot.ridgeHidesSun', far: 'onFoot.farHidesSun' },
  earth: { ridge: 'onFoot.ridgeHidesEarth', far: 'onFoot.farHidesEarth' },
} as const;

/** What hides `body`, in a sentence; none when it shows. */
function hiderSentence(i18n: I18n, body: SeenBody): string | null {
  const { blocker } = body;
  if (blocker.kind === 'clear') return null;
  if (blocker.kind === 'ridge') {
    return i18n.t(HIDES[body.id].ridge, ridgeParams(i18n, blocker));
  }
  const distance = i18n.number(localSize(0) / 2000, 0);
  return i18n.t(HIDES[body.id].far, { distance });
}

export interface ViewWords {
  readonly yawDeg: number;
  readonly bodies: readonly SeenBody[];
  /** Where the eye stands (VENT-121); absent or at the point: nothing. */
  readonly where?: EyeReport | null | undefined;
  /** The site's short name, which the place is read from. */
  readonly site?: string | undefined;
}

/** «You stand 180 m NE of IM-2.» once the eye walked away. */
function whereSentence(i18n: I18n, view: ViewWords): string[] {
  const at = view.where?.at;
  if (!at || !isAway(at)) return [];
  return [i18n.t('walk.alt', { where: whereText(i18n, at, view.site ?? '') })];
}

/** The view's text alternative. */
export function viewAlt(i18n: I18n, view: ViewWords): string {
  const deg = i18n.number(Math.round(view.yawDeg) % 360);
  const dir = directionOf(i18n, view.yawDeg);
  const head = i18n.t('onFoot.alt', { deg, dir });
  const lines = view.bodies.flatMap((body) => {
    const hider = hiderSentence(i18n, body);
    const seen = bodySentence(i18n, body, true);
    return hider ? [seen, hider] : [seen];
  });
  return [head, ...whereSentence(i18n, view), ...lines].join(' ');
}
