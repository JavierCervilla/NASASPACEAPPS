/**
 * The site picker that fills the sheet (validated canvas «Phone · site
 * picker sheet»): a search over names and missions in every region, a
 * South pole / Apollo / Other control that filters when there is no
 * search, and the list.
 */
import type { SiteGroup } from '@ventana/sim';
import { useState } from 'react';
import type { PhoneSite } from '../../phone/phone-site';
import { filterSites, foldText, REGIONS } from '../../phone/site-search';
import type { NowState } from '../../phone/widget-types';
import { Icon } from './Icon';
import { SiteList } from './SiteList';

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly selected: PhoneSite;
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  readonly onDone: () => void;
}

function Search(props: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="search">
      <Icon name="search" />
      <span className="visually-hidden">Search a site or mission</span>
      <input
        type="search"
        placeholder="Search a site or mission"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

/** The region control; while a search spans every region it is off. */
function Regions(props: {
  value: SiteGroup;
  off: boolean;
  onChange: (g: SiteGroup) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label="Region">
      {REGIONS.map(([group, label]) => (
        <button key={group} type="button" disabled={props.off} aria-pressed={!props.off && group === props.value} onClick={() => props.onChange(group)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function SitePicker({ sites, selected, state, onPick, onDone }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<SiteGroup>(selected.group);
  const shown = filterSites(sites, { query, group });
  const searching = foldText(query) !== '';
  return (
    <div className="picker">
      <div className="picker__head">
        <h2 className="picker__title">Landing sites</h2>
        <button type="button" className="picker__done" onClick={onDone}>Done</button>
      </div>
      <Search value={query} onChange={setQuery} />
      <Regions value={group} off={searching} onChange={setGroup} />
      <SiteList
        sites={shown}
        selectedId={selected.id}
        state={state}
        onPick={onPick}
        withRegion={searching}
      />
    </div>
  );
}
