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
 * The near ground as the on-foot scene reads it (VENT-34, VENT-46): an `n`
 * x `n` grid of the session's local frame, rows north to south, columns
 * west to east, centred on the site, resampled from the relief rings
 * (ring/ring-local.ts). The drawn relief is the rings' meshes; this grid is
 * what the props, the astronaut's feet, the ridge and the Sun's shadows
 * stand on. Where the relief comes from is ring/ring-source.ts.
 */

/**
 * One grid as the scene takes it: transferable numbers only, placed by
 * `key` in the session's frame (metres east and north of the site, which
 * is the origin).
 */
export interface HeightTile {
  /** Names the grid. */
  readonly key: string;
  /** The grid's centre, metres east and north of the site. */
  readonly originEast: number;
  readonly originNorth: number;
  /** Samples per side; the centre is sample `(n - 1) / 2`. */
  readonly n: number;
  /** The square's side, metres. */
  readonly sizeM: number;
  /**
   * Row-major heights of the frame's y (the curvature in them), metres
   * over the site's ground.
   */
  readonly heights: Float32Array;
  /** The finest LOLA grid that served any node, metres. */
  readonly resolutionM: number;
}
