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
 * Whether the near ground can stand at all (VENT-46). One tile that is a 404
 * is a hole the parent fills, but when every tile of the finest two levels is
 * a 404 nothing near is drawable: the server has no terrain for the point
 * (a list is answered for any point), and that is the route's final
 * «no terrain», not a failure to retry. Only a 404 counts: a tile that
 * failed on passing errors stays a hole and the near ground reports itself.
 */
import { NoTerrainHereError } from '../../horizon/horizon-errors';

export interface NearWatch {
  /** Records a near tile's end; throws when all the near tiles are 404. */
  readonly done: (absent: boolean) => void;
  /** True once the near tiles are all 404: later jobs do nothing. */
  readonly dead: () => boolean;
}

/** Watches `total` near tiles (levels 0 and 1). */
export function watchNear(total: number): NearWatch {
  let ended = 0;
  let absent = 0;
  return {
    done: (wasAbsent) => {
      ended += 1;
      if (wasAbsent) absent += 1;
      if (ended === total && absent === total) throw new NoTerrainHereError();
    },
    dead: () => total > 0 && absent === total,
  };
}
