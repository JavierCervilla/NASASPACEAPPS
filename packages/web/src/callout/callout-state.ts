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

/**
 * Which of the four signal states holds at the selected hour, and how long
 * it lasts: the callout's pill. The state is the «Right now» widget's own
 * (`nowState`) and the time left the countdowns' own (`timeLeft`), on the
 * same rolling horizon, so the callout and the widgets never disagree.
 * Pure.
 */
import { timeLeft } from '../phone/body-widget';
import { nowState } from '../phone/now-widget';
import { sampleAt, samplesWithin } from '../phone/site-widgets';
import { widgetRange } from '../phone/widget-range';
import type { HoursResult } from '../phone/widgets-loader';
import type { NowState } from '../phone/widget-types';

/** The pill: the state, its name, and how long it lasts. */
export interface CalloutState {
  readonly kind: NowState;
  /** On the image (desktop): «Landing window now», «Neither». */
  readonly badge: string;
  /** With the time left (phone): «Landing window · 7 d left». */
  readonly pill: string;
}

/** The legend's names of the four states. */
const NAMES: Readonly<Record<NowState, string>> = {
  window: 'Landing window',
  sun: 'Sun only',
  earth: 'Earth only',
  none: 'Neither',
};

/** The state at the hour of `atMs`; null until its hours are known. */
export function calloutState(
  hours: HoursResult,
  atMs: number | null,
): CalloutState | null {
  const range = atMs === null ? null : widgetRange(atMs);
  if (!range || hours.kind !== 'ready') return null;
  const horizon = samplesWithin(hours.hours, range.at, range.horizonEnd);
  const now = sampleAt(horizon, range.at);
  if (!now) return null;
  const kind = nowState(now);
  const left = timeLeft(horizon, now, (sample) => nowState(sample) === kind);
  const name = NAMES[kind];
  const badge = kind === 'window' ? `${name} now` : name;
  return { kind, badge, pill: `${name} · ${left} left` };
}
