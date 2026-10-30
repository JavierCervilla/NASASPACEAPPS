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

/**
 * Keeps what the globe's callout says: the selected site at the selected
 * instant, with its month's hours from the shared cache (the site card
 * and the calendar ask for the same month, so no extra request). The
 * globe follows the watched value; React renders nothing for it.
 */
import { useEffect, useState } from 'react';
import {
  calloutContent,
  type CalloutContent,
} from '../callout/callout-content';
import type { CardSite } from '../card/site-facts';
import { createWatchedValue, type WatchedValue } from '../lib/watched-value';
import type { SiteStore } from '../phone/site-store';
import { unlistedSite } from '../phone/unlisted-site';
import { useMonthHours, useTime, type CalendarParts } from './calendar/hooks';
import { useSelection } from './phone/hooks';

interface FeedProps {
  readonly sites: readonly CardSite[];
  readonly store: SiteStore;
  readonly parts: CalendarParts;
  /** The site's base path, for the thumbnails. */
  readonly base: string;
}

/** The callout's content, as a value the globe watches. */
export function useCalloutFeed(
  props: FeedProps,
): WatchedValue<CalloutContent | null> {
  const { sites, store, parts, base } = props;
  const [feed] = useState(() =>
    createWatchedValue<CalloutContent | null>(null),
  );
  const { id } = useSelection(store);
  const atMs = useTime(parts.time)?.atMs ?? null;
  const { result: hours } = useMonthHours(parts.load, id, atMs);
  const site = sites.find((s) => s.id === id) ?? unlistedSite(id);
  useEffect(() => {
    feed.set(calloutContent({ site, hours, atMs, base }));
  }, [feed, site, hours, atMs, base]);
  return feed;
}
