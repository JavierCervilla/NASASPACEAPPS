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
import { useEffect, useMemo, useState } from 'react';
import { pickQuality } from '../../globe/quality-pick';
import type { LatLon } from '../../lib/polar-projection';
import { isPhoneViewport } from '../../lib/viewport';
import { ringTier, type RingTier } from '../../terrain/ring/ring-plan';
import type { RingSource } from '../../terrain/ring/ring-source';
import { runRing, type RingState } from '../../terrain/ring/ring-session';

const LOADING: RingState = { kind: 'loading' };
/** Lets the page draw and answer input between two slices of work. */
const breathe = (): Promise<void> =>
  new Promise((done) => window.setTimeout(done, 0));

/** The rings this device draws (its quality tier, read once). */
export function useRingTier(): RingTier {
  return useMemo(() => ringTier(pickQuality(isPhoneViewport()).tier), []);
}

/** The rings of `point` (null: no coordinates) and how to ask again. */
export function useRing(source: RingSource, point: LatLon | null) {
  const [state, setState] = useState<RingState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const tier = useRingTier();
  const lat = point?.lat;
  const lonEast = point?.lonEast;
  useEffect(() => {
    if (lat === undefined || lonEast === undefined) return undefined;
    const abort = new AbortController();
    setState(LOADING);
    const run = { source, point: { lat, lonEast }, tier, breathe,
      signal: abort.signal };
    void runRing(run, setState);
    return () => abort.abort();
  }, [source, lat, lonEast, tier, attempt]);
  return { state, retry: () => setAttempt((n) => n + 1) };
}
