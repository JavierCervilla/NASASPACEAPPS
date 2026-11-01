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
 * polar map, site card, calendar strip and site button or, on phones, the
 * shell over it. The header's tabs switch the desktop view (the globe
 * hides while the polar map shows; phones always keep the globe). They
 * share what is created here and passed down: one selection store, so
 * the globe and the views always agree on the site; one instant with its
 * player and one cache of the API's hours, so the globe's Sun, the
 * widgets and the calendar show the same time; the sheet's top edge, so
 * the globe frames the selected site above the sheet; and the selected
 * site's state, which its marker on the globe wears; and the globe's
 * layers with the sites saved on this device (VENT-37).
 */
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import type { Catalogue } from '../i18n/catalogue';
import type { UiLocale } from '../i18n/locales';
import { createI18n } from '../i18n/translate';
import { localStore } from '../i18n/choice';
import { cachedComputed, pointsOf } from '../source/computed-hours';
import { createSourceStore } from '../source/data-source';
import { followClock } from '../calendar/follow-clock';
import { createPlayer } from '../calendar/time-player';
import { createTimeStore } from '../calendar/time-store';
import { createWatchedValue } from '../lib/watched-value';
import { browserHourClock } from '../phone/hour-clock';
import type { CardSite } from '../card/site-facts';
import { createSiteStore } from '../phone/site-store';
import { PinLayers } from './pin/PinLayers';
import { PinContext } from './pin/context';
import { useCreatePinKit } from './pin/use-kit';
import { SavedContext } from './saved/context';
import { useCreateSavedKit } from './saved/use-saved-kit';
import type { CalendarParts } from './calendar/hooks';
import { DesktopShell } from './desktop/DesktopShell';
import { useView } from './desktop/use-view';
import Globe from './Globe';
import { I18nContext, useI18n } from './i18n-context';
import { Layers } from './Layers';
import { OfflineNotice } from './OfflineNotice';
import { usePhone } from './phone/hooks';
import { PhoneShell } from './phone/PhoneShell';
import { useStateFeed } from './use-state-feed';
import { useLiveFavicon } from './use-live-favicon';
import { useHoursLoader } from './use-hours-loader';

interface Props {
  /** The landing sites endpoint, same origin in production. */
  readonly sitesUrl: string;
  /** The site's base path, for the Moon texture. */
  readonly base: string;
  /** The site selected at start. */
  readonly selectedId: string;
  /** The curated sites, for the site pickers, the map and the card. */
  readonly sites: readonly CardSite[];
  /** The page's language, and its catalogue (only this one ships). */
  readonly locale: UiLocale;
  readonly messages: Catalogue;
}

/** The header's view tabs (components/Page.astro). */
const VIEW_NAV = 'nav.views';

/**
 * The shared instant (live on the browser's clock, which it follows once
 * the island runs), its player, and the hours loader with its cache. The
 * loader starts afresh each time the browser comes back online, so the
 * views ask for their hours again, quietly, over the old ones. With them,
 * the simulator's hours of the listed sites and the chosen data source.
 */
function useCalendarParts(
  sitesUrl: string,
  sites: readonly CardSite[],
): CalendarParts {
  const [clock] = useState(() => {
    const time = createTimeStore(() => Date.now());
    const player = createPlayer(time, {
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (id) => window.clearTimeout(id),
    });
    const computed = cachedComputed(pointsOf(sites));
    return { time, player, computed, source: createSourceStore(localStore()) };
  });
  const load = useHoursLoader(sitesUrl);
  const parts = useMemo(() => ({ ...clock, load }), [clock, load]);
  useEffect(() => followClock(clock.time, browserHourClock()), [clock]);
  useEffect(() => clock.player.pause, [clock]);
  return parts;
}

export default function LunarApp(props: Props) {
  const { locale, messages } = props;
  const [i18n] = useState(() => createI18n(locale, messages));
  return (
    <I18nContext value={i18n}>
      <Island {...props} />
    </I18nContext>
  );
}

interface SectionProps {
  readonly globe: ComponentProps<typeof Globe>;
  readonly source: CalendarParts['source'];
  readonly computed: boolean;
  /** The header tab's view: on desktop the section hides off the globe. */
  readonly view: ReturnType<typeof useView>;
}

/**
 * The globe with its Layers key; hidden while the polar map or the DSN
 * view shows (phones have no polar map, but have the DSN view, VENT-7).
 */
function GlobeSection({ globe, source, computed, view }: SectionProps) {
  const { t } = useI18n();
  const hidden = usePhone() ? view === 'dsn' : view !== 'globe';
  return (
    <section className="globe" aria-label={t('globe.section')} hidden={hidden} data-computed={computed}>
      <Globe {...globe} />
      <Layers source={source} />
    </section>
  );
}

function Island({ sitesUrl, base, selectedId, sites }: Props) {
  const [store] = useState(() => createSiteStore(selectedId));
  const [sheetEdge] = useState(() => createWatchedValue<number | null>(null));
  const parts = useCalendarParts(sitesUrl, sites);
  const view = useView(VIEW_NAV);
  const { feed: state, computed } = useStateFeed(store, parts);
  useLiveFavicon(base, parts.time, state);
  const time = parts.time;
  // The address's `?site=` and `?lat&lon` open once the kit runs.
  const kit = useCreatePinKit({ store, time, state, sites });
  const saved = useCreateSavedKit(kit, store);
  const layers = saved.layers;
  const globe = { base, sitesUrl, store, sheetEdge, time, state, layers };
  const section = { globe, source: parts.source, computed, view };
  return (
    <SavedContext value={saved}>
      <PinContext value={kit}>
        <GlobeSection {...section} />
        <DesktopShell {...{ sites, store, parts, base, view }} />
        <PhoneShell {...{ sites, store, sheetEdge, parts, base, view }} />
        <OfflineNotice base={base} />
        <PinLayers />
      </PinContext>
    </SavedContext>
  );
}
