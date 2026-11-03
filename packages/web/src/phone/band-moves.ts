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
 * When the on-foot view's free band moves on a phone (VENT-52): the
 * sheet's edge, its bottom, moves with the sheet, and the top bar, its
 * top, grows with the text size (200 %), which no window resize tells.
 */

type Listen = (listener: () => void) => () => void;

/**
 * Calls back on each move of the sheet's edge (`edgeMoves`) and each
 * resize of `bar`; returns the unsubscribe.
 */
export function bandMoves(bar: () => Element | null, edgeMoves: Listen) {
  return (listener: () => void): (() => void) => {
    const off = edgeMoves(listener);
    const el = bar();
    const observer = el ? new ResizeObserver(() => listener()) : null;
    if (el) observer?.observe(el);
    return () => {
      off();
      observer?.disconnect();
    };
  };
}
