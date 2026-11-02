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
 * The selected point's height tile for the on-foot view (VENT-34): asked
 * from the {@link TileSource} when the point changes, with the horizon's
 * retries (tile-fetch.ts); «Try again» asks once more.
 */
import { useEffect, useState } from 'react';
import type { LatLon } from '../../lib/polar-projection';
import { TILE_SIZE_M, type TileSource } from '../../terrain/tile';
import { askTile, type TileState } from '../../terrain/tile-fetch';

const LOADING: TileState = { kind: 'loading' };
const sleep = (ms: number): Promise<void> =>
  new Promise((done) => window.setTimeout(done, ms));

/** The tile of `point` (null: no coordinates) and how to ask again. */
export function useTile(source: TileSource, point: LatLon | null) {
  const [state, setState] = useState<TileState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const lat = point?.lat;
  const lonEast = point?.lonEast;
  useEffect(() => {
    if (lat === undefined || lonEast === undefined) return undefined;
    let live = true;
    setState(LOADING);
    const ask = { source, point: { lat, lonEast }, sizeM: TILE_SIZE_M };
    void askTile(ask, { sleep, random: Math.random }).then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, [source, lat, lonEast, attempt]);
  return { state, retry: () => setAttempt((n) => n + 1) };
}
