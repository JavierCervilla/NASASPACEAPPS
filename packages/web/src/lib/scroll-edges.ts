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
 * Which edges of a scroll box have content past them, so the box can fade
 * there (apple-design's scroll edge effect): a box cut off with no fade
 * gives no sign that it scrolls. Pure.
 */

/** The scroll metrics of a box, as the DOM reports them. */
export interface ScrollMetrics {
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

/** Whether content hides past the top and past the bottom. */
export interface ScrollEdges {
  readonly top: boolean;
  readonly bottom: boolean;
}

/** Sub-pixel layout can leave a fraction of a px: not content. */
const SLACK_PX = 1;

/** The edges of `box` that have content past them. */
export function scrollEdges(box: ScrollMetrics): ScrollEdges {
  const { scrollTop, scrollHeight, clientHeight } = box;
  return {
    top: scrollTop > SLACK_PX,
    bottom: scrollTop + clientHeight < scrollHeight - SLACK_PX,
  };
}
