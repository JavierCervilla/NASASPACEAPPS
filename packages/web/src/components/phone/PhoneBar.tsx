/**
 * The phone's glass top bar: the title, how to move the Moon, and the site
 * pill (a status dot, the short name and what tells it apart) that opens
 * the site picker.
 */
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { Icon } from './Icon';

interface Props {
  readonly site: PhoneSite;
  /** The site's state right now, once its data has loaded. */
  readonly state: NowState | null;
  readonly onOpenPicker: () => void;
}

/**
 * The pill: two lines, so co-located sites (IM-2 and the Mons Mouton zone)
 * never read the same.
 */
function SitePill({ site, state, onOpenPicker }: Props) {
  const { pill, pillDetail } = siteLabels(site);
  const name = pillDetail ? `${pill}, ${pillDetail}` : pill;
  return (
    <button
      type="button"
      className="site-pill"
      aria-label={`Change site, now ${name}`}
      onClick={onOpenPicker}
    >
      <span className="signal-dot" data-state={state ?? 'loading'} />
      <span className="site-pill__names">
        <span className="site-pill__name">{pill}</span>
        {pillDetail ? (
          <span className="site-pill__detail">{pillDetail}</span>
        ) : null}
      </span>
      <Icon name="chevron" />
    </button>
  );
}

export function PhoneBar(props: Props) {
  return (
    <header className="phone-bar">
      <div className="phone-bar__titles">
        <h1 className="phone-bar__title">Ventana Lunar</h1>
        <p className="phone-bar__hint">Drag the Moon · pinch to zoom</p>
      </div>
      <SitePill {...props} />
    </header>
  );
}
