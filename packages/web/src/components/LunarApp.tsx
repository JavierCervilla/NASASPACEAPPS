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
 * The page's one island: the globe section and, around it, the desktop
 * calendar strip and site button or, on phones, the shell over it. They
 * share what is created here and passed down: one selection store, so
 * the globe and the views always agree on the site; one instant with its
 * player and one cache of the API's hours, so the globe's Sun, the
 * widgets and the calendar show the same time; and the sheet's top edge,
 * so the globe keeps its label above the sheet.
 */
import { useEffect, useState } from 'react';
import { followClock } from '../calendar/follow-clock';
import { createPlayer } from '../calendar/time-player';
import { createTimeStore } from '../calendar/time-store';
import { createWatchedValue } from '../lib/watched-value';
import { browserHourClock } from '../phone/hour-clock';
import { cachedHours } from '../phone/hours-cache';
import type { PhoneSite } from '../phone/phone-site';
import { createSiteStore } from '../phone/site-store';
import type { CalendarParts } from './calendar/hooks';
import { DesktopShell } from './desktop/DesktopShell';
import Globe from './Globe';
import { PhoneShell } from './phone/PhoneShell';

interface Props {
  /** The landing sites endpoint, same origin in production. */
  readonly sitesUrl: string;
  /** The site's base path, for the Moon texture. */
  readonly base: string;
  /** The site selected at start. */
  readonly selectedId: string;
  /** The curated sites, for the phone's site picker. */
  readonly sites: readonly PhoneSite[];
}

function Layers() {
  return (
    <aside className="globe-layers" aria-label="Layers">
      <h2>Layers</h2>
      <ul>
        <li><span className="layer-key layer-key--exact" aria-hidden="true"></span>Landing sites</li>
        <li><span className="layer-key layer-key--zone" aria-hidden="true"></span>Approximate zones</li>
        <li className="soon"><span className="layer-key layer-key--rover" aria-hidden="true"></span>Ghost rovers (soon)</li>
      </ul>
    </aside>
  );
}

/**
 * The shared instant (live on the browser's clock, which it follows once
 * the island runs), its player, and the hours loader with its cache.
 */
function useCalendarParts(sitesUrl: string): CalendarParts {
  const [parts] = useState(() => {
    const time = createTimeStore(() => Date.now());
    const player = createPlayer(time, {
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (id) => window.clearTimeout(id),
    });
    const fetch = globalThis.fetch.bind(globalThis);
    return { time, player, load: cachedHours({ fetch, sitesUrl }) };
  });
  useEffect(() => followClock(parts.time, browserHourClock()), [parts]);
  useEffect(() => parts.player.pause, [parts]);
  return parts;
}

export default function LunarApp({ sitesUrl, base, selectedId, sites }: Props) {
  const [store] = useState(() => createSiteStore(selectedId));
  const [sheetEdge] = useState(() => createWatchedValue<number | null>(null));
  const parts = useCalendarParts(sitesUrl);
  const globe = { base, sitesUrl, store, sheetEdge, time: parts.time };
  return (
    <>
      <section className="globe" aria-label="Lunar globe">
        <Globe {...globe} />
        <Layers />
      </section>
      <DesktopShell sites={sites} store={store} parts={parts} />
      <PhoneShell {...{ sites, store, sheetEdge, parts }} />
    </>
  );
}
