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
 * The picker's list of sites: the solid or dashed symbol (exact touchdown
 * or approximate zone), the name, the mission and a check on the
 * selection. Co-located sites get a row each, so a site hidden under
 * another marker on the globe is still reachable. A selected custom point
 * not saved (VENT-37) heads the list with the pin's mark and the check.
 */
import { formatCoords } from '../../i18n/format';
import {
  rowDetail,
  siteLabels,
  splitName,
  type PhoneSite,
} from '../../phone/phone-site';
import { regionName } from '../../phone/site-search';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';

interface RowProps {
  readonly site: PhoneSite;
  readonly selected: boolean;
  /** The selected site's state right now, when known. */
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  /** Whether the row names its region (a search spans every region). */
  readonly withRegion: boolean;
}

export function Check() {
  const { t } = useI18n();
  return (
    <svg className="site-row__check" width="16" height="16" viewBox="0 0 16 16" role="img" aria-label={t('picker.selected')}>
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SiteRow(props: RowProps) {
  const { site, selected, state, onPick } = props;
  const kind = site.approximate ? 'zone' : 'exact';
  const i18n = useI18n();
  const region = props.withRegion ? regionName(i18n, site.group) : '';
  const detail = rowDetail(i18n, site, selected ? state : null, region);
  return (
    <li>
      <button
        type="button"
        className="site-row"
        aria-current={selected ? 'true' : undefined}
        onClick={() => onPick(site.id)}
      >
        <span className="site-symbol" data-kind={kind} data-state={(selected && state) || undefined} />
        <span className="site-row__text">
          <span className="site-row__title">{splitName(site.name).title}</span>
          <span className="site-row__detail">{detail}</span>
        </span>
        {selected ? <Check /> : null}
      </button>
    </li>
  );
}

/** The selected custom point, «Custom point · Near … · 85.87° S, 61.34° E». */
function CurrentRow(props: { site: PhoneSite; state: NowState | null }) {
  const { site, state } = props;
  const i18n = useI18n();
  const { title, subtitle } = siteLabels(site);
  const coords = formatCoords(i18n, site.lat, site.lonEast);
  const detail = [subtitle, coords].filter(Boolean).join(' · ');
  return (
    <li>
      <span className="site-row site-row--current" aria-current="true">
        <span className="site-symbol" data-kind="pin" data-state={state ?? undefined} />
        <span className="site-row__text">
          <span className="site-row__title">{title}</span>
          <span className="site-row__detail">{detail}</span>
        </span>
        <Check />
      </span>
    </li>
  );
}

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly selectedId: string;
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  readonly withRegion: boolean;
  /** The selected custom point, when not saved: it heads the list. */
  readonly current?: PhoneSite | null;
}

export function SiteList(props: Props) {
  const { sites, selectedId, state, onPick, withRegion, current } = props;
  const { t } = useI18n();
  if (sites.length === 0 && !current) {
    return <p className="site-list-empty">{t('picker.empty')}</p>;
  }
  return (
    <ul className="site-list" data-sheet-scroll aria-label={t('picker.list')}>
      {current ? <CurrentRow site={current} state={state} /> : null}
      {sites.map((site) => (
        <SiteRow
          key={site.id}
          site={site}
          selected={site.id === selectedId}
          state={state}
          onPick={onPick}
          withRegion={withRegion}
        />
      ))}
    </ul>
  );
}
