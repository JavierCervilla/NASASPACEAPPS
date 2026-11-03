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
 * The browser's clocks for the pin (VENT-10, VENT-37), injected where it
 * moves and waits: the next animation frame, a timer, and the time now.
 */

/** Calls `fn` on the next animation frame; returns how to cancel it. */
export const nextFrame = (fn: (ms: number) => void): (() => void) => {
  const id = requestAnimationFrame(fn);
  return () => cancelAnimationFrame(id);
};

/** Calls `fn` once after `ms`; returns how to call it off. */
export const after = (fn: () => void, ms: number): (() => void) => {
  const id = window.setTimeout(fn, ms);
  return () => window.clearTimeout(id);
};

/** The time now, ms, on the clock {@link after} and the events keep. */
export const now = (): number => performance.now();
