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
 * South pole / Apollo / Other / Saved control that filters when there is
 * no search, and the list. «Saved» (VENT-37) lists the sites saved on this
 * device, and the picker opens on it when one of them is selected; an
 * unsaved custom point heads the other lists, checked, so the selection
 * is always marked. Under the title everything scrolls as one, so the
 * phone sheet's settings (pin, layers, language) never squeeze the list.
 */
import { useState, type ReactNode } from 'react';
import type { PhoneSite } from '../../phone/phone-site';
import { filterSites, foldText } from '../../phone/site-search';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';
import { SavedList } from '../saved/SavedList';
import { SaveIcon } from '../saved/SaveIcon';
import { Icon } from './Icon';
import { Regions, type Segment } from './PickerRegions';
import { SiteList } from './SiteList';

export interface PickerProps {
  readonly sites: readonly PhoneSite[];
  readonly selected: PhoneSite;
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  readonly onDone: () => void;
  /** Under the title: the phone's language row (SitesPanel.tsx). */
  readonly languageRow?: ReactNode;
  /**
   * Beside «Done», the icon-only «Save» for a custom point (VENT-42): the
   * phone's full sheet hides the half sheet's «Save»; the desktop card
   * keeps its own beside the popover.
   */
  readonly withSave?: boolean;
}

function Search(props: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="search">
      <Icon name="search" />
      <span className="visually-hidden">{t('picker.search')}</span>
      <input
        type="search"
        placeholder={t('picker.placeholder')}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

type HeadProps = Pick<PickerProps, 'selected' | 'onDone' | 'withSave'>;

function PickerHead({ selected, onDone, withSave }: HeadProps) {
  const { t } = useI18n();
  return (
    <div className="picker__head">
      <h2 className="picker__title">{t('picker.title')}</h2>
      {withSave ? <SaveIcon site={selected} /> : null}
      <button type="button" className="picker__done" onClick={onDone}>{t('picker.done')}</button>
    </div>
  );
}

/** The list under the control: the saved sites, or the listed ones. */
function PickerList(props: PickerProps & { segment: Segment; query: string }) {
  const { sites, selected, state, onPick, segment, query } = props;
  const searching = foldText(query) !== '';
  if (segment === 'saved' && !searching) {
    return <SavedList selectedId={selected.id} state={state} onPick={onPick} />;
  }
  const group = segment === 'saved' ? selected.group : segment;
  const unsaved = selected.custom && !selected.custom.saved && !searching;
  return (
    <SiteList
      sites={filterSites(sites, { query, group })}
      selectedId={selected.id}
      state={state}
      onPick={onPick}
      withRegion={searching}
      current={unsaved ? selected : null}
    />
  );
}

export function SitePicker(props: PickerProps) {
  const { selected, onDone } = props;
  const [query, setQuery] = useState('');
  const start = selected.custom?.saved ? 'saved' : selected.group;
  const [segment, setSegment] = useState<Segment>(start);
  const searching = foldText(query) !== '';
  return (
    <div className="picker">
      <PickerHead
        selected={selected}
        onDone={onDone}
        withSave={props.withSave === true}
      />
      <div className="picker__scroll" data-sheet-scroll>
        {props.languageRow}
        <Search value={query} onChange={setQuery} />
        <Regions value={segment} off={searching} onChange={setSegment} />
        <PickerList {...props} segment={segment} query={query} />
      </div>
    </div>
  );
}
