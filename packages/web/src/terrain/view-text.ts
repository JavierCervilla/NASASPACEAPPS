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
 * The on-foot view's words (VENT-34): the caption that marks what is
 * illustrative, and the distance rings' and the ridge's labels. Pure.
 */
import type { I18n } from '../i18n/translate';
import type { Ridge } from './ridge';

/** «Fine detail illustrative · relief LOLA 20 m». */
export const detailCaption = (i18n: I18n, resolutionM: number): string =>
  i18n.t('onFoot.caption', { res: i18n.number(resolutionM) });

/** The caption's second line: the Earth's map, and the lifted shadows. */
export const captionNote = (i18n: I18n): string =>
  i18n.t('onFoot.captionNote');

/** «100 m», a distance ring's label. */
export const ringLabel = (i18n: I18n, metres: number): string =>
  i18n.t('onFoot.ring', { distance: i18n.number(metres) });

/** The height and distance of `ridge`, as the labels write them. */
export const ridgeParams = (i18n: I18n, ridge: Ridge) => ({
  height: i18n.number(Math.round(ridge.heightM)),
  distance: i18n.number(ridge.distanceM / 1000, 1),
});

/** «Ridge 48 m · 1.2 km», on the ridge in the scene. */
export const ridgeLabel = (i18n: I18n, ridge: Ridge): string =>
  i18n.t('onFoot.ridge', ridgeParams(i18n, ridge));
