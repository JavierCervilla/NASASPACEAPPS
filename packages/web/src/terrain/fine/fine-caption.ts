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
 * The caption's first line when the view stands on the fine real relief
 * (VENT-62). Pure.
 */
import type { I18n } from '../../i18n/translate';
import type { FineKind, FineSite } from './fine-catalog';

/** What each fine source is called: product names, never translated. */
const FINE_SOURCE: Record<FineKind, string> = { nac: 'LROC NAC DTM', pgda: 'PGDA' };

/** «Fine detail illustrative · relief LROC NAC DTM 4 m · LOLA 20 m beyond». */
export const fineCaption = (
  i18n: I18n,
  site: FineSite,
  lolaM: number,
): string => i18n.t('onFoot.captionFine', { source: FINE_SOURCE[site.kind],
  res: i18n.number(site.sourceM), lola: i18n.number(lolaM) });
