/**
 * The floating tab bar: Globe, Calendar, Horizon and Sites. Calendar and
 * Horizon say «soon» until their views exist; Sites opens the picker.
 */
import { Icon, type IconName } from './Icon';

interface Props {
  /** Whether the site picker fills the sheet. */
  readonly picking: boolean;
  readonly onGlobe: () => void;
  readonly onSites: () => void;
}

interface Tab {
  readonly icon: IconName;
  readonly label: string;
  readonly current?: boolean;
  readonly onClick?: () => void;
}

function TabButton({ icon, label, current, onClick }: Tab) {
  const soon = onClick === undefined;
  return (
    <button
      type="button"
      className="tab"
      aria-current={current ? 'true' : undefined}
      aria-disabled={soon ? 'true' : undefined}
      aria-label={soon ? `${label} (soon)` : undefined}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {soon ? <span className="tab__soon">soon</span> : null}
    </button>
  );
}

export function TabBar({ picking, onGlobe, onSites }: Props) {
  return (
    <nav className="tab-bar" aria-label="Views">
      <TabButton icon="globe" label="Globe" current={!picking} onClick={onGlobe} />
      <TabButton icon="calendar" label="Calendar" />
      <TabButton icon="horizon" label="Horizon" />
      <TabButton icon="sites" label="Sites" current={picking} onClick={onSites} />
    </nav>
  );
}
