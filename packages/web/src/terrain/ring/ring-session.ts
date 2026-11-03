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
 * One view's ring from first request to a standing ground (VENT-46): asks
 * the source for the tiles the windows want, and as soon as the finest two
 * levels have come (or failed) resamples the near ground, 4 km at 15.6 m,
 * in slices, and tells the view it can stand; the coarser rings go on
 * arriving into the same store, which the scene watches. The near ground is
 * what the props, the eye and the Sun's shadows read. Failures end
 * as the horizon's states (VENT-45).
 */
import { unitOf } from './ring-frame';
import { stand, type Live } from './ring-near';
import { finish } from './ring-nodes';
import { NOT_LISTED, land, settle } from './ring-progress';
import { tell, wantedBy } from './ring-wanted';
import type { RingRun, RingState } from './ring-state';
import { settledState } from './ring-state';
import type { RingFeed } from './ring-source';
import { RingStore } from './ring-store';
import { windowsFor } from './ring-window';

export type { RingRun, RingState, RingView } from './ring-state';
export { settledState } from './ring-state';

/** The source's feed for `run`: tiles into the store, standing on time. */
function feedFor(
  run: RingRun,
  live: Live,
  report: (state: RingState) => void,
): RingFeed {
  const dir = unitOf(run.point.lat, run.point.lonEast);
  const second = Math.min(1, run.tier.levels - 1);
  return {
    scheme: (scheme) => {
      live.store = new RingStore(scheme);
      live.windows = windowsFor(scheme, dir, run.tier.levels);
    },
    tile: (tile) => {
      live.store?.add(tile);
      tell(run, (p) => land(p, tile));
    },
    settled: (level) => {
      run.note?.(`ring level ${level} settled`);
      tell(run, (p) => settle(p, level));
      if (level === second) void stand(run, live, report);
    },
  };
}

/** Runs the ring: reports `loading`, then `ready` or a final failure. */
export async function runRing(
  run: RingRun,
  report: (state: RingState) => void,
): Promise<void> {
  const { point, tier, signal } = run;
  const live: Live = { store: null, windows: [], standing: false };
  const wanted = wantedBy(run, live);
  tell(run, () => NOT_LISTED);
  try {
    const request = { point, levels: tier.levels, wanted };
    await run.source.load(request, feedFor(run, live, report), signal);
    await stand(run, live, report);
    if (live.store) finish(live.store);
  } catch (error) {
    if (signal.aborted) return;
    const state = settledState(error);
    run.note?.(`ring failed: ${state.kind}`);
    report(state);
  }
}
