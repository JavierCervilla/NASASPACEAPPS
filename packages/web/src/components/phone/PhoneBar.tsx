/**
 * The phone's glass top bar: the title, how to move the Moon, and the site
 * pill (a status dot and the short name) that opens the site picker.
 */
import { shortName, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { Icon } from './Icon';

interface Props {
  readonly site: PhoneSite;
  /** The site's state right now, once its data has loaded. */
  readonly state: NowState | null;
  readonly onOpenPicker: () => void;
}

export function PhoneBar({ site, state, onOpenPicker }: Props) {
  const name = shortName(site);
  return (
    <header className="phone-bar">
      <div className="phone-bar__titles">
        <h1 className="phone-bar__title">Ventana Lunar</h1>
        <p className="phone-bar__hint">Drag the Moon · pinch to zoom</p>
      </div>
      <button
        type="button"
        className="site-pill"
        aria-label={`Change site, now ${name}`}
        onClick={onOpenPicker}
      >
        <span className="signal-dot" data-state={state ?? 'loading'} />
        <span className="site-pill__name">{name}</span>
        <Icon name="chevron" />
      </button>
    </header>
  );
}
