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
 * Keeps the selected site's state at the selected instant, for the
 * globe's selected marker and its ring, with the month's hours from the
 * shared cache (the site card and the calendar ask for the same month,
 * so no extra request). The globe follows the watched value; React
 * renders nothing for it.
 */
import { useEffect, useState } from 'react';
import { createWatchedValue, type WatchedValue } from '../lib/watched-value';
import { siteState } from '../phone/site-state';
import type { SiteStore } from '../phone/site-store';
import type { NowState } from '../phone/widget-types';
import { useTime, type CalendarParts } from './calendar/hooks';
import { useI18n } from './i18n-context';
import { useSelection } from './phone/hooks';
import { useSiteHours } from './use-site-hours';

/** The selected site's state, as a value the globe watches. */
export function useStateFeed(
  store: SiteStore,
  parts: CalendarParts,
): WatchedValue<NowState | null> {
  const [feed] = useState(() => createWatchedValue<NowState | null>(null));
  const { id } = useSelection(store);
  const atMs = useTime(parts.time)?.atMs ?? null;
  const { result: hours } = useSiteHours(parts, id, atMs);
  const i18n = useI18n();
  const kind = siteState(hours, atMs, i18n)?.kind ?? null;
  useEffect(() => {
    feed.set(kind);
  }, [feed, kind]);
  return feed;
}
