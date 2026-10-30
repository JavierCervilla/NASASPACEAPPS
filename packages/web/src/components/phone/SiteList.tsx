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
 * another marker on the globe is still reachable.
 */
import {
  rowDetail,
  splitName,
  type PhoneSite,
} from '../../phone/phone-site';
import { regionName } from '../../phone/site-search';
import type { NowState } from '../../phone/widget-types';

interface RowProps {
  readonly site: PhoneSite;
  readonly selected: boolean;
  /** The selected site's state right now, when known. */
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  /** Whether the row names its region (a search spans every region). */
  readonly withRegion: boolean;
}

function Check() {
  return (
    <svg className="site-row__check" width="16" height="16" viewBox="0 0 16 16" role="img" aria-label="Selected">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SiteRow(props: RowProps) {
  const { site, selected, state, onPick } = props;
  const kind = site.approximate ? 'zone' : 'exact';
  const region = props.withRegion ? regionName(site.group) : '';
  const detail = rowDetail(site, selected ? state : null, region);
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

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly selectedId: string;
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  readonly withRegion: boolean;
}

export function SiteList(props: Props) {
  const { sites, selectedId, state, onPick, withRegion } = props;
  if (sites.length === 0) {
    return <p className="site-list-empty">No sites match.</p>;
  }
  return (
    <ul className="site-list" data-sheet-scroll aria-label="Sites">
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
