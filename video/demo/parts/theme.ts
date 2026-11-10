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
 * The look of the demo videos, from the app's design tokens
 * (packages/web/src/styles/tokens.css): the dark surfaces, the text greys
 * and the three signal colours with their fixed meaning (Sun yellow, Earth
 * blue, window green), in the app's face (system-ui, SF Pro on a Mac).
 */
export const C = {
  bg: "#07080b",
  strip: "#101116",
  card: "#16171c",
  edge: "rgba(255, 255, 255, 0.08)",
  text: "#f2f2f4",
  secondary: "#c7c8ce",
  muted: "#9a9ca6",
  sun: "#f5c542",
  earth: "#4a9cff",
  window: "#3ddc84",
};
export const FONT = "system-ui";
/** The team's name. */
export const TEAM = "Universelle";
/** The English line under the Spanish name, for judges who do not read Spanish. */
export const TAGLINE = "Your landing window on the Moon";
export const URL_TEXT = "nasa.universelle.io";
export const URL_QR = "https://nasa.universelle.io";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
