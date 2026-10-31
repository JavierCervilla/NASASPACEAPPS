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
 * The site picker that fills the sheet (validated canvas «Phone · site
 * picker sheet»): a search over names and missions in every region, a
 * South pole / Apollo / Other control that filters when there is no
 * search, and the list.
 */
import type { SiteGroup } from '@ventana/sim';
import { useState, type ReactNode } from 'react';
import type { PhoneSite } from '../../phone/phone-site';
import {
  filterSites,
  foldText,
  regionName,
  REGIONS,
} from '../../phone/site-search';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';
import { Icon } from './Icon';
import { SiteList } from './SiteList';

export interface PickerProps {
  readonly sites: readonly PhoneSite[];
  readonly selected: PhoneSite;
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  readonly onDone: () => void;
  /** Under the title: the phone's language row (SitesPanel.tsx). */
  readonly languageRow?: ReactNode;
}

function Search(props: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="search">
      <Icon name="search" />
      <span className="visually-hidden">{t('picker.search')}</span>
      <input
        type="search"
        placeholder={t('picker.search')}
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
  const i18n = useI18n();
  return (
    <div className="segmented" role="group" aria-label={i18n.t('picker.region')}>
      {REGIONS.map((group) => (
        <button key={group} type="button" disabled={props.off} aria-pressed={!props.off && group === props.value} onClick={() => props.onChange(group)}>
          {regionName(i18n, group)}
        </button>
      ))}
    </div>
  );
}

function PickerHead({ onDone }: { readonly onDone: () => void }) {
  const { t } = useI18n();
  return (
    <div className="picker__head">
      <h2 className="picker__title">{t('picker.title')}</h2>
      <button type="button" className="picker__done" onClick={onDone}>{t('picker.done')}</button>
    </div>
  );
}

export function SitePicker(props: PickerProps) {
  const { sites, selected, state, onPick, onDone } = props;
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<SiteGroup>(selected.group);
  const shown = filterSites(sites, { query, group });
  const searching = foldText(query) !== '';
  return (
    <div className="picker">
      <PickerHead onDone={onDone} />
      {props.languageRow}
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
