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
 * Hands the shared instant and the selected point to the `?debug` readout
 * (VENT-105), which says them over its trail: nothing unless the page has
 * the dev tools (lib/dev-tools-loader.ts), and then only once their chunk
 * has come after the page has started.
 */
import { useEffect } from 'react';
import type { TimeStore } from '../calendar/time-store';
import type { CardSite } from '../card/site-facts';
import type { InstantPlace } from '../devtools/instant-reading';
import type { HorizonStore } from '../horizon/horizon-store';
import { devToolsModule } from '../lib/dev-tools-loader';
import type { SiteStore } from '../phone/site-store';
import { customPointOf } from '../pin/custom-point';

export interface DebugInstantParts {
  readonly time: TimeStore;
  readonly store: SiteStore;
  readonly sites: readonly CardSite[];
  readonly horizons: HorizonStore;
}

/** The selected listed site or custom point; null without coordinates. */
function placeOf(parts: DebugInstantParts): InstantPlace | null {
  const { id } = parts.store.get();
  const listed = parts.sites.find((site) => site.id === id);
  const point = listed ?? customPointOf(id);
  if (!point || !Number.isFinite(point.lat)
    || !Number.isFinite(point.lonEast)) return null;
  const profile = parts.horizons.terrain.get()(id) ?? null;
  return { lat: point.lat, lonEast: point.lonEast, profile };
}

export function useDebugInstant(parts: DebugInstantParts): void {
  const { time, store, sites, horizons } = parts;
  useEffect(() => {
    let live = true;
    let stop = (): void => undefined;
    const source = { time, place: () => placeOf({ time, store, sites,
      horizons }) };
    void devToolsModule()?.then(({ devTools }) => devTools())
      .then((tools) => {
        if (live) stop = tools.conditions.watchInstant(source);
      });
    return () => {
      live = false;
      stop();
    };
  }, [time, store, sites, horizons]);
}
