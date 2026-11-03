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
 * Where the compass sits on a phone (VENT-50): one gap under the glass top
 * bar and, while the first-time pin hint or «New version ready» shows
 * (stacked: the row, then the hint, VENT-52), under them too. The hint
 * itself keeps one gap under the bar (components/pin/PinHint.tsx), so the
 * compass needs only the hint's height, not where it was drawn. It stands
 * only while the whole button is above the sheet's top edge: at 200 %
 * text the half sheet rises to the full detent and covers the globe, and
 * the compass goes with it (VENT-51). Pure.
 */

/** Room between the bars, the hint and the compass, px (PinHint's gap). */
export const GAP_PX = 8;

/**
 * The compass's top edge, px from the viewport's top, for a top bar whose
 * bottom edge is at `barBottom` and a hint `hintHeight` px tall (null: none).
 */
export function compassTop(barBottom: number, hintHeight: number | null) {
  const underBar = barBottom + GAP_PX;
  return hintHeight === null ? underBar : underBar + hintHeight + GAP_PX;
}

/**
 * The height of what stacks under the top bar (the «New version ready»
 * row, then the pin hint, VENT-52) from their heights, a gap between
 * two; null when none shows (a height of 0 is a hidden row).
 */
export function stackHeight(heights: readonly number[]): number | null {
  const shown = heights.filter((height) => height > 0);
  if (shown.length === 0) return null;
  const sum = shown.reduce((total, height) => total + height, 0);
  return sum + GAP_PX * (shown.length - 1);
}

/**
 * Whether the sheet's top edge `sheetTop` (null: no sheet) covers any of
 * the compass `height` px tall whose top edge is at `top`, px from the
 * viewport's top.
 */
export function compassCovered(
  top: number,
  height: number,
  sheetTop: number | null,
): boolean {
  return sheetTop !== null && top + height > sheetTop;
}
