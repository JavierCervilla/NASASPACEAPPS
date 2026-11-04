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
 * The illustrative rocks (VENT-34): smooth, rounded, all under 1 m, more
 * of the small ones, scattered round the point from its seed (seeded.ts),
 * none right under the eye. LOLA cannot see them:
 * the caption says so. Pure.
 */

export interface Rock {
  readonly east: number;
  readonly north: number;
  /** Metres. */
  readonly radius: number;
  /** Height over width, flatter than a ball. */
  readonly squash: number;
  readonly yawRad: number;
  /**
   * The centre's height over the ground in half-heights (VENT-62): 1 rests
   * on it, 0 is half buried. Absent: 0.35, a little sunk.
   */
  readonly lift?: number;
  /** Lumpiness, a share of the radius (VENT-62); absent: round. */
  readonly rough?: number;
}
