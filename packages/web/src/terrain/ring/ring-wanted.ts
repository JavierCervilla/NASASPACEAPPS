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
 * What a ring run tells its progress (VENT-60): the route's tiles the
 * view's windows want, as the session filters them, and any change, unless
 * the run was left.
 */
import type { TileScheme } from '@ventana/sim';
import type { RingEntry } from './ring-answer';
import type { Live } from './ring-near';
import { listed, type RingProgress } from './ring-progress';
import type { RingRun } from './ring-state';
import { touches } from './ring-window';

/** Tells `run`'s progress of a change, unless the run was left. */
export function tell(
  run: RingRun,
  change: (p: RingProgress) => RingProgress,
): void {
  if (!run.signal.aborted) run.progress?.update(change);
}

/** The route's tiles the windows want, told to the progress. */
export function wantedBy(run: RingRun, live: Live) {
  return (scheme: TileScheme, entries: readonly RingEntry[]) => {
    const kept = entries.filter((e) => {
      const w = live.windows[e.level];
      return e.level < run.tier.levels && w !== undefined &&
        touches(w, e.x, e.y);
    });
    tell(run, () => listed(scheme, kept));
    return kept;
  };
}
