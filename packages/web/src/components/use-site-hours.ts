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
 * A site's month as the views show it for the chosen data source
 * (VENT-36): the API's hours from the shared cache, the simulator's for
 * the same site and range, at once, and how they compare
 * (source/month-view.ts).
 */
import { useMemo, useSyncExternalStore } from 'react';
import { monthStartMs } from '../calendar/month';
import type { HoursLoader } from '../phone/hours-cache';
import {
  computedMonth,
  type ComputedLoader,
} from '../source/computed-hours';
import type { DataSource, SourceStore } from '../source/data-source';
import type { HorizonStore } from '../horizon/horizon-store';
import { monthView } from '../source/month-view';
import { useMonthHours } from './calendar/hooks';

/** Where the views take a site's hours from. */
export interface HoursParts {
  /** The API's hours (Horizons), cached. */
  readonly load: HoursLoader;
  /** The simulator's hours, cached. */
  readonly computed: ComputedLoader;
  /** The visitor's choice of source. */
  readonly source: SourceStore;
  /** The terrain horizons, whose lapsed requests a retry asks again. */
  readonly horizons?: Pick<HorizonStore, 'retryFailed'>;
}

/** The static page is built on the default, Horizons. */
const onServer = (): DataSource => 'horizons';

/** The chosen data source, re-rendering when it changes. */
export function useDataSource(source: SourceStore): DataSource {
  return useSyncExternalStore(source.subscribe, source.get, onServer);
}

/**
 * The month of `atMs` of site `id` as the views show it, the source it
 * was chosen from, and a retry of the API's requests: the month's hours
 * and any point's terrain that failed in passing (VENT-45). The computed
 * hours are worked out once per site and month, in the render: the
 * answer is there before the API's.
 */
export function useSiteHours(
  parts: HoursParts,
  id: string,
  atMs: number | null,
) {
  const { result: horizons, retry } = useMonthHours(parts.load, id, atMs);
  const source = useDataSource(parts.source);
  const month = atMs === null ? null : monthStartMs(atMs);
  const computed = useMemo(
    () => (month === null ? null : computedMonth(parts.computed, id, month)),
    [parts.computed, id, month],
  );
  const again = (): void => {
    retry();
    parts.horizons?.retryFailed();
  };
  return { ...monthView(source, horizons, computed), source, retry: again };
}
