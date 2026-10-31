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
 * The phone layout over the globe: the glass top bar, the bottom sheet
 * (site summary with widgets, the site picker or the calendar) and the
 * floating tab bar. Rendered only below the phone breakpoint.
 */
import { useEffect, useRef } from 'react';
import { formatInstant } from '../../calendar/instant-format';
import type { WatchedValue } from '../../lib/watched-value';
import type { PhoneSite } from '../../phone/phone-site';
import { sheetActions } from '../../phone/sheet-actions';
import {
  hoursStatus,
  siteState,
  stateLines,
} from '../../phone/site-state';
import type { SiteStore } from '../../phone/site-store';
import { unlistedSite } from '../../phone/unlisted-site';
import { CalendarSheet } from '../calendar/CalendarSheet';
import { useTime, type CalendarParts } from '../calendar/hooks';
import { useI18n } from '../i18n-context';
import { usePhone, useScrim, useSelection, useSiteWidgets } from './hooks';
import { PhoneBar } from './PhoneBar';
import { Sheet } from './Sheet';
import { SourceCaption, SourceDown } from '../source/SourceNotes';
import { SitesPanel } from './SitesPanel';
import { SiteSummary } from './SiteSummary';
import { TabBar } from './TabBar';
import { useSheetPanel } from './use-sheet-detent';

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly store: SiteStore;
  /** Where the sheet's top edge is, for the globe's label; null: none. */
  readonly sheetEdge: WatchedValue<number | null>;
  /** The shared instant, its player and the hours loader. */
  readonly parts: CalendarParts;
  /** The site's base path, for the site's thumbnail. */
  readonly base: string;
}

/**
 * The selected site, its widgets at the selected instant, the sheet's
 * detent and view and what the controls do to it
 * (phone/sheet-actions.ts). A selected id the build-time list lacks gets
 * a neutral site with that id, never another site's name over this one's
 * widgets.
 */
function usePhoneState({ sites, store, parts }: Props) {
  const selection = useSelection(store);
  const site =
    sites.find((s) => s.id === selection.id) ?? unlistedSite(selection.id);
  const time = useTime(parts.time);
  const i18n = useI18n();
  const at = time?.atMs ?? null;
  const widgets = useSiteWidgets(parts, selection.id, at);
  const when = time && !time.live ? formatInstant(i18n, time.atMs) : null;
  const panel = useSheetPanel();
  const { result, hours, computed } = widgets;
  const state = result.kind === 'ready' ? result.widgets.now.state : null;
  const status = hoursStatus(hours, at);
  const known = siteState(hours, at, i18n, computed);
  const lines = stateLines(known, status, i18n);
  const select = (id: string): void => store.select(id, 'list');
  const actions = sheetActions(panel.setDetent, select, panel.setView);
  const pill = { state, lines, computed };
  return { site, widgets, when, at, ...pill, ...panel, ...actions };
}

type PhoneState = ReturnType<typeof usePhoneState>;

/** The sheet's name for what fills it. */
const SHEET_LABELS = { sites: 'site.choose', calendar: 'sheet.calendar' } as const;

/**
 * The sheet's props; the tab bar's element, where a drag up opens the
 * closed sheet; and the top bar's, which the full sheet stays under. On
 * unmount the globe is told there is no sheet any more.
 */
function useSheetWiring(
  phone: PhoneState,
  sheetEdge: Props['sheetEdge'],
  dim: (value: number) => void,
) {
  const tabs = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const { t } = useI18n();
  useEffect(() => () => sheetEdge.set(null), [sheetEdge]);
  const atFull = phone.detent === 'full';
  const sheet = {
    label: t(atFull ? SHEET_LABELS[phone.view] : 'sheet.summary'),
    detent: phone.detent,
    onDetent: phone.setDetent,
    onOpenness: dim,
    onEdge: sheetEdge.set,
    edge: tabs,
    bar,
  };
  return { tabs, bar, current: atFull ? phone.view : 'globe', sheet } as const;
}

/**
 * What fills the sheet: at full the picker or the calendar, else the
 * summary.
 */
function SheetBody(props: { phone: PhoneState } & Props) {
  const { phone, sites, parts, base } = props;
  const { site, state, widgets, when } = phone;
  if (phone.detent === 'full' && phone.view === 'calendar') {
    return <CalendarSheet parts={parts} site={site} state={state} />;
  }
  if (phone.detent === 'full') {
    return (
      <SitesPanel
        sites={sites}
        selected={site}
        state={state}
        onPick={phone.pick}
        onDone={phone.close}
        base={base}
        source={parts.source}
      />
    );
  }
  const { result, retry: onRetry } = widgets;
  const source = { month: widgets, atMs: phone.at };
  const notes = <SourceCaption {...source} />;
  const summary = { site, result, onRetry, when, base, notes };
  return <SiteSummary {...summary} status={<SourceDown {...source} />} />;
}

function PhoneUi(props: Props) {
  const phone = usePhoneState(props);
  const [scrim, dim] = useScrim();
  const wiring = useSheetWiring(phone, props.sheetEdge, dim);
  const { tabs, bar, current, sheet } = wiring;
  const tabActions = {
    onGlobe: phone.close,
    onCalendar: phone.calendar,
    onSites: phone.open,
  };
  const { site, state, lines, computed } = phone;
  const pill = { site, state, lines, computed, onOpenPicker: phone.open };
  return (
    <div className="phone">
      <div ref={scrim} className="phone-scrim" aria-hidden="true" />
      <PhoneBar ref={bar} {...pill} />
      <Sheet {...sheet}>
        <SheetBody phone={phone} {...props} />
      </Sheet>
      <TabBar ref={tabs} current={current} {...tabActions} />
    </div>
  );
}

export function PhoneShell(props: Props) {
  return usePhone() ? <PhoneUi {...props} /> : null;
}
