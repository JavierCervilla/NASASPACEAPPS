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
 * The quiet caption under the simulator's hours (VENT-36, Javier's
 * decision): they are ours and approximate, their elevations within the
 * bound measured against JPL Horizons over the months the model was
 * checked (`@ventana/sim`'s accuracy, held by its validation test; the
 * azimuth is not bound by it); any other month is extrapolated from the
 * same model and says so. Pure.
 */
import {
  toMs,
  VALIDATED_ELEVATION_DEG,
  VALIDATED_FROM,
  VALIDATED_TO,
} from '@ventana/sim';
import { monthStartMs } from '../calendar/month';
import type { I18n } from '../i18n/translate';

/** Whether the month of `atMs` lies in the checked period. */
function checkedMonth(atMs: number): boolean {
  const first = monthStartMs(atMs);
  return first >= toMs(VALIDATED_FROM) && first <= toMs(VALIDATED_TO);
}

/** The caption for the computed hours of the month of `atMs`. */
export function computedCaption(i18n: I18n, atMs: number): string {
  if (!checkedMonth(atMs)) return i18n.t('source.captionExtrapolated');
  const deg = i18n.number(VALIDATED_ELEVATION_DEG, 2);
  return i18n.t('source.caption', { deg });
}
