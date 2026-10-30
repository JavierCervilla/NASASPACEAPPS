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
 * The desktop layout around the globe: the calendar strip under it and
 * the site button in the page header (a slot the page leaves for it,
 * filled once the island runs, so the static page never shows a stale
 * site or instant). Rendered only from the phone breakpoint up.
 */
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { PhoneSite } from '../../phone/phone-site';
import type { SiteStore } from '../../phone/site-store';
import { unlistedSite } from '../../phone/unlisted-site';
import { widgetsAt } from '../../phone/widgets-loader';
import { CalendarStrip } from '../calendar/CalendarStrip';
import { useCalendar, type CalendarParts } from '../calendar/hooks';
import { usePhone, useSelection } from '../phone/hooks';
import { SiteMenu } from './SiteMenu';

/** The header element the site button goes in. */
const SLOT_ID = 'site-slot';

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly store: SiteStore;
  readonly parts: CalendarParts;
}

const unchanging = (): (() => void) => () => undefined;

/** The header slot, once the page is in the browser; null before. */
function useSlot(): HTMLElement | null {
  const find = (): HTMLElement | null => document.getElementById(SLOT_ID);
  return useSyncExternalStore(unchanging, find, () => null);
}

function DesktopUi({ sites, store, parts }: Props) {
  const { id } = useSelection(store);
  const site = sites.find((s) => s.id === id) ?? unlistedSite(id);
  const calendar = useCalendar(parts, id);
  const atMs = calendar.state?.atMs;
  const now = atMs === undefined ? null : widgetsAt(calendar.result, atMs);
  const state = now?.kind === 'ready' ? now.widgets.now.state : null;
  const slot = useSlot();
  const pick = (picked: string): void => store.select(picked, 'list');
  const menu = { sites, site, state, onPick: pick };
  return (
    <>
      <CalendarStrip parts={parts} calendar={calendar} />
      {slot ? createPortal(<SiteMenu {...menu} />, slot) : null}
    </>
  );
}

export function DesktopShell(props: Props) {
  return usePhone() ? null : <DesktopUi {...props} />;
}
