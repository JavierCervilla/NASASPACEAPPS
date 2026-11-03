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
 * The selected point's relief rings for the on-foot view (VENT-46): asked
 * from the {@link RingSource} when the point changes (the ring route, then
 * the tiles, VENT-45's retries inside), the near ground resampled as the
 * finest two levels land, and the coarser rings left to arrive into the
 * view's store; «Try again» asks once more.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { LatLon } from '../../lib/polar-projection';
import { parseLeaveOut } from '../../terrain/leave-out';
import {
  nearRings,
  ringTier,
  type RingTier,
} from '../../terrain/ring/ring-plan';
import type { RingSource } from '../../terrain/ring/ring-source';
import { runRing, type RingState } from '../../terrain/ring/ring-session';
import type { ViewTier } from '../../terrain/view-tier';

const LOADING: RingState = { kind: 'loading' };
/** Lets the page draw and answer input between two slices of work. */
const breathe = (): Promise<void> =>
  new Promise((done) => window.setTimeout(done, 0));

/**
 * The rings the view draws: its tier's (view-tier.ts), so a change of tier
 * asks for them again; less the far levels under `?onfoot=far`.
 */
export function useRingTier(view: ViewTier): RingTier {
  const { tier } = useSyncExternalStore(view.subscribe, view.get, view.get);
  return useMemo(() => {
    const rings = ringTier(tier);
    const near = parseLeaveOut(window.location.search).has('far');
    return near ? nearRings(rings) : rings;
  }, [tier]);
}

/**
 * The rings of `point` (null: no coordinates) and how to ask again; `note`
 * tells the crash report how they come (VENT-49).
 */
export function useRing(
  source: RingSource,
  point: LatLon | null,
  view: ViewTier,
  note: (text: string) => void,
) {
  const [state, setState] = useState<RingState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const tier = useRingTier(view);
  const lat = point?.lat;
  const lonEast = point?.lonEast;
  useEffect(() => {
    if (lat === undefined || lonEast === undefined) return undefined;
    const abort = new AbortController();
    setState(LOADING);
    const run = { source, point: { lat, lonEast }, tier, breathe, note,
      signal: abort.signal };
    void runRing(run, setState);
    return () => abort.abort();
  }, [source, lat, lonEast, tier, attempt, note]);
  return { state, retry: () => setAttempt((n) => n + 1) };
}
