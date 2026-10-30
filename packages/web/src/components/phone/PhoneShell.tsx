/**
 * The phone layout over the globe: the glass top bar, the bottom sheet
 * (site summary with widgets, or the site picker) and the floating tab
 * bar. Rendered only below the phone breakpoint.
 */
import { useEffect, useRef } from 'react';
import type { WatchedValue } from '../../lib/watched-value';
import type { PhoneSite } from '../../phone/phone-site';
import { sheetActions } from '../../phone/sheet-actions';
import type { SiteStore } from '../../phone/site-store';
import { unlistedSite } from '../../phone/unlisted-site';
import {
  usePhone,
  useScrim,
  useSelection,
  useSiteWidgets,
} from './hooks';
import { PhoneBar } from './PhoneBar';
import { Sheet } from './Sheet';
import { SitePicker } from './SitePicker';
import { SiteSummary } from './SiteSummary';
import { TabBar } from './TabBar';
import { useSheetDetent } from './use-sheet-detent';

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly store: SiteStore;
  readonly sitesUrl: string;
  /** Where the sheet's top edge is, for the globe's label; null: none. */
  readonly sheetEdge: WatchedValue<number | null>;
}

/**
 * The selected site, its widgets, the sheet's detent and what the controls
 * do to it (phone/sheet-actions.ts). A selected id the build-time list
 * lacks gets a neutral site with that id, never another site's name over
 * this one's widgets.
 */
function usePhoneState({ sites, store, sitesUrl }: Props) {
  const selection = useSelection(store);
  const site =
    sites.find((s) => s.id === selection.id) ?? unlistedSite(selection.id);
  const widgets = useSiteWidgets(selection.id, sitesUrl);
  const [detent, setDetent] = useSheetDetent();
  const { result } = widgets;
  const state = result.kind === 'ready' ? result.widgets.now.state : null;
  const select = (id: string): void => store.select(id, 'list');
  const actions = sheetActions(setDetent, select);
  return { site, widgets, state, detent, setDetent, ...actions };
}

type PhoneState = ReturnType<typeof usePhoneState>;

/**
 * The sheet's props, and the tab bar's element, where a drag up opens the
 * closed sheet. On unmount the globe is told there is no sheet any more.
 */
function useSheetWiring(
  phone: PhoneState,
  sheetEdge: Props['sheetEdge'],
  dim: (value: number) => void,
) {
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => () => sheetEdge.set(null), [sheetEdge]);
  const picking = phone.detent === 'full';
  const sheet = {
    label: picking ? 'Choose a site' : 'Site summary',
    detent: phone.detent,
    onDetent: phone.setDetent,
    onOpenness: dim,
    onEdge: sheetEdge.set,
    edge: tabs,
  };
  return { tabs, picking, sheet };
}

/** What fills the sheet: the picker at full, else the site summary. */
function SheetBody(props: { phone: PhoneState; sites: Props['sites'] }) {
  const { phone, sites } = props;
  const { site, state, widgets } = phone;
  if (phone.detent === 'full') {
    return (
      <SitePicker
        sites={sites}
        selected={site}
        state={state}
        onPick={phone.pick}
        onDone={phone.close}
      />
    );
  }
  const { result, retry } = widgets;
  return <SiteSummary site={site} result={result} onRetry={retry} />;
}

function PhoneUi(props: Props) {
  const phone = usePhoneState(props);
  const [scrim, dim] = useScrim();
  const { tabs, picking, sheet } = useSheetWiring(phone, props.sheetEdge, dim);
  const tabActions = { onGlobe: phone.close, onSites: phone.open };
  const { site, state } = phone;
  return (
    <div className="phone">
      <div ref={scrim} className="phone-scrim" aria-hidden="true" />
      <PhoneBar site={site} state={state} onOpenPicker={phone.open} />
      <Sheet {...sheet}>
        <SheetBody phone={phone} sites={props.sites} />
      </Sheet>
      <TabBar ref={tabs} picking={picking} {...tabActions} />
    </div>
  );
}

export function PhoneShell(props: Props) {
  return usePhone() ? <PhoneUi {...props} /> : null;
}
