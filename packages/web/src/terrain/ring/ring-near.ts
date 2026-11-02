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
 * Standing on the near ground (VENT-46): once the finest two levels have
 * come (or failed) the near ground, 4 km at 15.6 m, is resampled from the
 * rings in slices, and the view is told it can stand.
 */
import { frameAt, unitOf } from './ring-frame';
import { LOCAL_N, fillRows, heightAtDir, localSize } from './ring-local';
import { finest } from './ring-nodes';
import { fillGaps } from './ring-read';
import type { RingRun, RingState, RingView } from './ring-state';
import type { RingStore } from './ring-store';
import type { Window } from './ring-window';

/** Rows of the near grid resampled between two breaths. */
const ROWS_PER_SLICE = 8;

/** The near ground over `store`, or null when the site has no height. */
export async function nearOf(
  run: RingRun,
  store: RingStore,
  windows: Window[],
) {
  const { point, tier } = run;
  const dir = unitOf(point.lat, point.lonEast);
  const ground = heightAtDir(store, { from: 0, levels: tier.levels }, dir);
  if (Number.isNaN(ground)) return null;
  const frame = frameAt(point, ground);
  const ys = new Float32Array(LOCAL_N * LOCAL_N);
  const source = { store, frame, reach: { from: 0, levels: tier.levels } };
  for (let row = 0; row < LOCAL_N; row += ROWS_PER_SLICE) {
    const to = Math.min(row + ROWS_PER_SLICE, LOCAL_N);
    fillRows(ys, source, localSize(0), [row, to]);
    await run.breathe();
  }
  fillGaps(ys);
  const tile = { key: 'near', originEast: 0, originNorth: 0, n: LOCAL_N,
    sizeM: localSize(0), heights: ys, resolutionM: finest(store) };
  const near = { tile, ys };
  return { store, frame, windows, tier, near, resolutionM: finest(store) };
}

/** What a run holds while the tiles come. */
export interface Live {
  store: RingStore | null;
  windows: Window[];
  standing: boolean;
}

/** Stands the view on the near ground once, when it can. */
export async function stand(
  run: RingRun,
  live: Live,
  report: (state: RingState) => void,
): Promise<void> {
  if (live.standing || !live.store || run.signal.aborted) return;
  live.standing = true;
  const view: RingView | null = await nearOf(run, live.store, live.windows);
  if (run.signal.aborted) return;
  run.note?.(view ? 'near ground standing' : 'near ground has no height');
  report(view ? { kind: 'ready', ring: view } : { kind: 'unavailable' });
}
