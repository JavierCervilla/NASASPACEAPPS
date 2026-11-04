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
 * Asking a layout about a block of cells (VENT-66). Window and hole edges
 * fall on any cell of a lattice (windowsFor centres on the site) but are
 * straight, so a block whose corners agree is wholly in or out; only a block
 * an edge crosses is asked cell by cell. Pure.
 */

/** Cells per side of the blocks a layout is first asked about. */
export const BLOCK = 4;

/** Whether the cell at `row`, `col` (of the tile's lattice) is drawn. */
export type Ask = (row: number, col: number) => boolean;

/** How `ask` answers for the cells of the block at `br`, `bc`. */
export function askBlock(ask: Ask, stride: number, br: number, bc: number) {
  const last = BLOCK - stride;
  const corners = [[0, 0], [0, last], [last, 0], [last, last]]
    .map(([r = 0, c = 0]) => ask(br + r, bc + c));
  const [first] = corners;
  if (corners.every((c) => c === first)) return (): boolean => first === true;
  return (r: number, c: number): boolean => ask(br + r, bc + c);
}
