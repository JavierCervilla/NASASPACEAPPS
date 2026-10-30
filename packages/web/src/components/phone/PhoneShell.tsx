/**
 * The phone layout over the globe: the glass top bar, the bottom sheet
 * (site summary with widgets, or the site picker) and the floating tab
 * bar. Rendered only below the phone breakpoint.
 */
import { useEffect, useState } from 'react';
import type { WatchedValue } from '../../lib/watched-value';
import type { PhoneSite } from '../../phone/phone-site';
import type { SiteStore } from '../../phone/site-store';
import { unlistedSite } from '../../phone/unlisted-site';
import type { DetentName } from '../../sheet/sheet-physics';
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

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly store: SiteStore;
  readonly sitesUrl: string;
  /** Where the sheet's top edge is, for the globe's label; null: none. */
  readonly sheetEdge: WatchedValue<number | null>;
}

/**
 * The selected site, its widgets and the sheet's detent. A selected id the
 * build-time list lacks gets a neutral site with that id, never another
 * site's name over this one's widgets.
 */
function usePhoneState({ sites, store, sitesUrl }: Props) {
  const selection = useSelection(store);
  const site =
    sites.find((s) => s.id === selection.id) ?? unlistedSite(selection.id);
  const widgets = useSiteWidgets(selection.id, sitesUrl);
  const [detent, setDetent] = useState<DetentName>('half');
  const { result } = widgets;
  const state = result.kind === 'ready' ? result.widgets.now.state : null;
  const close = (): void => setDetent('half');
  const open = (): void => setDetent('full');
  const pick = (id: string): void => {
    store.select(id, 'list');
    close();
  };
  const actions = { setDetent, open, close, pick };
  return { site, widgets, state, detent, ...actions };
}

type PhoneState = ReturnType<typeof usePhoneState>;

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
  const { site, state, detent } = phone;
  const { sheetEdge } = props;
  useEffect(() => () => sheetEdge.set(null), [sheetEdge]);
  const picking = detent === 'full';
  const label = picking ? 'Choose a site' : 'Site summary';
  return (
    <div className="phone">
      <div ref={scrim} className="phone-scrim" aria-hidden="true" />
      <PhoneBar site={site} state={state} onOpenPicker={phone.open} />
      <Sheet
        label={label}
        detent={detent}
        onDetent={phone.setDetent}
        onOpenness={dim}
        onEdge={sheetEdge.set}
      >
        <SheetBody phone={phone} sites={props.sites} />
      </Sheet>
      <TabBar picking={picking} onGlobe={phone.close} onSites={phone.open} />
    </div>
  );
}

export function PhoneShell(props: Props) {
  return usePhone() ? <PhoneUi {...props} /> : null;
}
