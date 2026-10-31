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
 * The desktop layout around the globe: the polar map in its place when
 * that tab is chosen, the site card beside the view, the calendar strip
 * under both, and the site button in the page header (a slot the page
 * leaves for it, filled once the island runs, so the static page never
 * shows a stale site or instant). The card and the strip share one load
 * of the month's hours, so a retry refreshes both. Rendered only from the
 * phone breakpoint up.
 */
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { siteCard } from '../../card/site-card';
import type { CardSite } from '../../card/site-facts';
import type { View } from '../../lib/view-tabs';
import type { SiteStore } from '../../phone/site-store';
import { siteState } from '../../phone/site-state';
import { unlistedSite } from '../../phone/unlisted-site';
import { LOADING, widgetsAt } from '../../phone/widgets-loader';
import { CalendarStrip } from '../calendar/CalendarStrip';
import { useCalendar, type CalendarParts } from '../calendar/hooks';
import { usePhone, useSelection } from '../phone/hooks';
import { PolarMap } from '../polar/PolarMap';
import { SiteCard } from './SiteCard';
import { SiteMenu } from './SiteMenu';

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

function DesktopUi({ sites, store, parts, base, view }: Props) {
  const { id } = useSelection(store);
  const site = sites.find((s) => s.id === id) ?? unlistedSite(id);
  const calendar = useCalendar(parts, id);
  const atMs = calendar.state?.atMs;
  const now = atMs === undefined ? null : widgetsAt(calendar.result, atMs);
  const state = now?.kind === 'ready' ? now.widgets.now.state : null;
  const badge = siteState(calendar.result, atMs ?? null);
  const model = atMs === undefined ? LOADING : siteCard(calendar.result, atMs);
  const slot = useSlot();
  const pick = (picked: string): void => store.select(picked, 'list');
  const menu = { sites, site, state, onPick: pick };
  const map = { sites, site, state, base, onPick: pick };
  return (
    <>
      {view === 'polar' ? <PolarMap {...map} /> : null}
      <SiteCard
        {...{ site, model, base, state: badge }}
        onRetry={calendar.retry}
      />
      <CalendarStrip parts={parts} calendar={calendar} />
      {slot ? createPortal(<SiteMenu {...menu} />, slot) : null}
    </>
  );
}

export function DesktopShell(props: Props) {
  return usePhone() ? null : <DesktopUi {...props} />;
}
