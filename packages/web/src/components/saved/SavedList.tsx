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
 * The «Saved» list of the site picker (VENT-37, validated canvases «Saved
 * list» and «Empty»): the sites saved on this device, newest first, each
 * with its pin, name, state at the shared instant and point, and a «…»
 * menu (rename, copy the coordinates, delete). With none saved yet, how to
 * save one. A delete moves the focus to the row that takes its place.
 */
import { useRef } from 'react';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';
import { useSavedKit, useSavedSites } from './context';
import { SavedRow } from './SavedRow';

interface Props {
  readonly selectedId: string;
  /** The selected site's state, as the card shows it. */
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
}

function EmptySaved() {
  const { t } = useI18n();
  return (
    <div className="saved-empty" role="status">
      <span className="saved-glyph saved-glyph--large" aria-hidden="true" />
      <p className="saved-empty__title">{t('saved.emptyTitle')}</p>
      <p className="saved-empty__text">{t('saved.emptyText')}</p>
    </div>
  );
}

/** After a delete at `index`, the focus goes to the row now there. */
function focusAfterDelete(list: HTMLUListElement | null, index: number) {
  requestAnimationFrame(() => {
    const rows = list?.querySelectorAll<HTMLElement>('.saved-row__pick');
    const next = rows?.[Math.min(index, rows.length - 1)];
    next?.focus();
  });
}

export function SavedList({ selectedId, state, onPick }: Props) {
  const sites = useSavedSites(useSavedKit());
  const { t } = useI18n();
  const list = useRef<HTMLUListElement>(null);
  if (sites.length === 0) return <EmptySaved />;
  return (
    <ul ref={list} className="site-list saved-list" data-sheet-scroll aria-label={t('saved.list')}>
      {sites.map((site, index) => (
        <SavedRow
          key={site.id}
          site={site}
          selected={site.id === selectedId}
          state={state}
          onPick={onPick}
          onDeleted={() => focusAfterDelete(list.current, index)}
        />
      ))}
    </ul>
  );
}
