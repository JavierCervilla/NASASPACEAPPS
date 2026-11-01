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

/** The phone sheet's four widgets, as text ready to show. */

/** What a lander has right now: the four signal states. */
export type NowState = 'window' | 'sun' | 'earth' | 'none';

export interface NowWidget {
  readonly state: NowState;
  /** «Landing window», «Sun only», «Earth only» or «No window». */
  readonly title: string;
  /** «47 % of November»: the month's share of window hours. */
  readonly detail: string;
}

/** The Sun or the Earth: when it sets (or rises) and where it is now. */
export interface BodyWidget {
  /** «Sunset in», «Sunrise in», «Earthset in» or «Earthrise in». */
  readonly label: string;
  /** «7 d 1 h», or «at least 7 d» when it outlasts the range. */
  readonly value: string;
  /** «Sun 6.4° up». */
  readonly detail: string;
}

export interface SiteWidgets {
  readonly now: NowWidget;
  readonly sun: BodyWidget;
  readonly earth: BodyWidget;
}
