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
 * The desktop layout around the globe: the polar map or the DSN view in
 * its place when that tab is chosen, the site card beside the view, the
 * calendar strip under both, and the site button in the page header (a
 * slot the page leaves for it, filled once the island runs, so the static
 * page never shows a stale site or instant). The card and the strip share
 * one load of the month's hours, so a retry refreshes both. Rendered only
 * from the phone breakpoint up.
 */
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { selectedSite } from '../../pin/selected-site';
import { siteCard } from '../../card/site-card';
import type { CardSite } from '../../card/site-facts';
import type { View } from '../../lib/view-tabs';
import type { SiteStore } from '../../phone/site-store';
import { siteState } from '../../phone/site-state';
import { LOADING, widgetsAt } from '../../phone/widgets-loader';
import { CalendarStrip } from '../calendar/CalendarStrip';
import { useDsn } from '../dsn/use-dsn';
import {
  useCalendar,
  type Calendar,
  type CalendarParts,
} from '../calendar/hooks';
import { useI18n } from '../i18n-context';
import { LanguageMenu } from '../lang/LanguageMenu';
import { usePhone, useSelection } from '../phone/hooks';
import { useSavedName } from '../saved/use-saved-name';
import { SourceNotes } from '../source/SourceNotes';
import { SiteHorizon } from '../horizon/SiteHorizon';
import type { HorizonStore } from '../../horizon/horizon-store';
import { SiteCard } from './SiteCard';
import { SiteMenu } from './SiteMenu';
import { DesktopView } from './DesktopView';

/** The header element the site button goes in. */
const SLOT_ID = 'site-slot';

interface Props {
  readonly sites: readonly CardSite[];
  readonly store: SiteStore;
  readonly parts: CalendarParts;
  /** The site's base path, for the polar map and the site's image. */
  readonly base: string;
  /** The view the header's tabs chose. */
  readonly view: View;
}

const unchanging = (): (() => void) => () => undefined;

/** The header slot, once the page is in the browser; null before. */
function useSlot(): HTMLElement | null {
  const find = (): HTMLElement | null => document.getElementById(SLOT_ID);
  return useSyncExternalStore(unchanging, find, () => null);
}

/**
 * The selected site's state, the card's badge, the card, its notes on
 * computed data and its horizon strip, at the selected instant, from the
 * month's hours.
 */
function useCardState(
  calendar: Calendar,
  site: CardSite,
  horizons: HorizonStore,
) {
  const i18n = useI18n();
  const { result, computed } = calendar;
  const atMs = calendar.state?.atMs;
  const now =
    atMs === undefined ? null : widgetsAt(result, atMs, i18n, computed);
  const state = now?.kind === 'ready' ? now.widgets.now.state : null;
  const badge = siteState(result, atMs ?? null, i18n, computed);
  const model =
    atMs === undefined ? LOADING : siteCard(result, atMs, i18n, computed);
  const notes = (
    <SourceNotes month={calendar} atMs={atMs ?? null} shadow={site.shadow} />
  );
  const strip = { site, atMs: atMs ?? null, hours: result, horizons };
  const horizon = <SiteHorizon {...strip} className="card-block horizon--card" />;
  return { state, badge, model, computed, notes, horizon };
}

/**
 * The view, the card, the strip and the site menu. In the Horizon view the
 * card leaves its horizon strip to the view's own, so one site never shows
 * two stretches side by side (VENT-55, V-16).
 */
function DesktopUi({ sites, store, parts, base, view }: Props) {
  const { id } = useSelection(store);
  const site = selectedSite(sites, id, useI18n(), useSavedName());
  const calendar = useCalendar(parts, id);
  const card = useCardState(calendar, site, parts.horizons);
  const { state, computed } = card;
  const atMs = calendar.state?.atMs ?? null;
  const dsn = useDsn(site, atMs, calendar.result);
  const slot = useSlot();
  const pick = (picked: string): void => store.select(picked, 'list');
  const menu = { sites, site, state, computed, onPick: pick };
  const map = { ...menu, base, source: parts.source };
  const shown = { view, map, dsn, site, parts };
  return (
    <>
      <DesktopView {...shown} hours={calendar.result} />
      <SiteCard {...card} {...{ site, base, dsn }} state={card.badge}
        horizon={view === 'horizon' ? null : card.horizon}
        onRetry={calendar.retry} />
      <CalendarStrip parts={parts} calendar={calendar} />
      {slot ? createPortal(<SiteMenu {...menu} />, slot) : null}
    </>
  );
}

export function DesktopShell(props: Props) {
  if (usePhone()) return null;
  return (
    <>
      <DesktopUi {...props} />
      <LanguageMenu base={props.base} />
    </>
  );
}
